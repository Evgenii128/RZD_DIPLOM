const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const logAudit = require("../utils/audit");

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = "SELECT * FROM clients WHERE 1=1";
    const params = [];

    if (search) {
      sql +=
        " AND (company_name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY company_name";
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM clients WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Клиент не найден" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      company_name,
      contact_person,
      tax_number,
      phone,
      email,
      legal_address,
      bank_details,
    } = req.body;

    const [result] = await pool.execute(
      "INSERT INTO clients (company_name, contact_person, tax_number, phone, email, legal_address, bank_details) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        company_name || null,
        contact_person || null,
        tax_number || null,
        phone || null,
        email || null,
        legal_address || null,
        bank_details || null,
      ],
    );

    await logAudit(
      "INSERT",
      "clients",
      `Создан клиент: ${company_name || "Без названия"}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Клиент успешно добавлен",
      data: {
        id: result.insertId,
        company_name,
        contact_person,
        tax_number,
        phone,
        email,
        legal_address,
        bank_details,
      },
    });
  } catch (error) {
    console.error("Ошибка создания клиента:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_name,
      contact_person,
      tax_number,
      phone,
      email,
      legal_address,
      bank_details,
    } = req.body;

    const [result] = await pool.execute(
      "UPDATE clients SET company_name = ?, contact_person = ?, tax_number = ?, phone = ?, email = ?, legal_address = ?, bank_details = ? WHERE id = ?",
      [
        company_name || null,
        contact_person || null,
        tax_number || null,
        phone || null,
        email || null,
        legal_address || null,
        bank_details || null,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Клиент не найден" });
    }

    await logAudit(
      "UPDATE",
      "clients",
      `Обновлен клиент ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Клиент успешно обновлен" });
  } catch (error) {
    console.error("Ошибка обновления клиента:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [contracts] = await pool.execute(
      "SELECT id FROM contracts WHERE client_id = ?",
      [id],
    );
    if (contracts.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Нельзя удалить клиента, у которого есть договоры",
      });
    }

    const [result] = await pool.execute("DELETE FROM clients WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Клиент не найден" });
    }

    await logAudit(
      "DELETE",
      "clients",
      `Удален клиент ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Клиент успешно удален" });
  } catch (error) {
    console.error("Ошибка удаления клиента:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
