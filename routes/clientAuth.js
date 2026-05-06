const express = require("express");
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require("../config/database");
const logAudit = require("../utils/audit");

router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      phone,
      company_name,
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
        "client",
        first_name || null,
        last_name || null,
        phone || null,
        true,
      ],
    );

    if (company_name) {
      await pool.execute(
        "INSERT INTO clients (user_id, company_name, contact_person, phone, email) VALUES (?, ?, ?, ?, ?)",
        [
          result.insertId,
          company_name,
          `${first_name || ""} ${last_name || ""}`.trim(),
          phone || null,
          email,
        ],
      );
    }

    await logAudit("REGISTER", "users", `Новый клиент: ${username}`, username);

    res.status(201).json({ success: true, message: "Регистрация успешна!" });
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    res.status(500).json({ success: false, error: "Ошибка сервера" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Введите логин и пароль" });
    }

    const [users] = await pool.execute(
      "SELECT * FROM users WHERE username = ? AND is_active = 1 AND role = ?",
      [username, "client"],
    );

    if (users.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: "Неверный логин или пароль" });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, error: "Неверный логин или пароль" });
    }

    await pool.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    res.cookie("client_token", "authenticated", {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });

    const userName =
      `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
      user.username;

    res.cookie(
      "client_info",
      JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone || "",
        name: userName,
      }),
      {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: false,
      },
    );

    res.json({
      success: true,
      message: "Вход выполнен",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        name: userName,
      },
    });
  } catch (error) {
    console.error("Ошибка входа:", error);
    res.status(500).json({ success: false, error: "Ошибка сервера" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("client_token");
  res.clearCookie("client_info");
  res.json({ success: true });
});

router.get("/check-auth", (req, res) => {
  const token = req.cookies?.client_token;
  res.json({ authenticated: token === "authenticated" });
});

router.get("/current-user", (req, res) => {
  const userInfo = req.cookies?.client_info;
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo);
      res.json({ success: true, user });
    } catch {
      res.json({ success: false });
    }
  } else {
    res.json({ success: false });
  }
});

module.exports = router;
