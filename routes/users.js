const express = require("express");
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require("../config/database");
const logAudit = require("../utils/audit");

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql =
      "SELECT id, username, email, role, first_name, last_name, phone, is_active, created_at, last_login FROM users WHERE 1=1";
    const params = [];

    if (search) {
      sql +=
        " AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    console.error("Ошибка загрузки пользователей:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, username, email, role, first_name, last_name, phone, is_active, created_at, last_login FROM users WHERE id = ?",
      [req.params.id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Пользователь не найден" });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      first_name,
      last_name,
      phone,
      is_active,
    } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Заполните обязательные поля" });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email],
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "Пользователь уже существует" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        username,
        email,
        hashedPassword,
        role || "client",
        first_name || null,
        last_name || null,
        phone || null,
        is_active !== false,
      ],
    );

    await logAudit(
      "INSERT",
      "users",
      `Создан пользователь: ${username}`,
      "Администратор",
    );

    res
      .status(201)
      .json({
        success: true,
        message: "Пользователь создан",
        id: result.insertId,
      });
  } catch (error) {
    console.error("Ошибка создания пользователя:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      password,
      role,
      first_name,
      last_name,
      phone,
      is_active,
    } = req.body;

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
      [username, email, id],
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "Логин или email уже занят" });
    }

    let sql =
      "UPDATE users SET username=?, email=?, role=?, first_name=?, last_name=?, phone=?, is_active=?";
    const params = [
      username,
      email,
      role,
      first_name,
      last_name,
      phone,
      is_active,
    ];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql += ", password_hash=?";
      params.push(hashedPassword);
    }

    sql += " WHERE id=?";
    params.push(id);

    const [result] = await pool.execute(sql, params);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Пользователь не найден" });
    }

    await logAudit(
      "UPDATE",
      "users",
      `Обновлён пользователь ID:${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Пользователь обновлён" });
  } catch (error) {
    console.error("Ошибка обновления:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Пользователь не найден" });
    }

    await logAudit(
      "DELETE",
      "users",
      `Удалён пользователь ID:${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Пользователь удалён" });
  } catch (error) {
    console.error("Ошибка удаления:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
