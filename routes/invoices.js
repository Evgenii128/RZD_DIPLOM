const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const logAudit = require("../utils/audit");

router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    let sql =
      "SELECT i.*, c.contract_number, cl.company_name FROM invoices i LEFT JOIN contracts c ON i.contract_id = c.id LEFT JOIN clients cl ON c.client_id = cl.id WHERE 1=1";
    const params = [];

    if (status) {
      if (status === "overdue") {
        sql += " AND i.status = 'pending' AND i.due_date < CURDATE()";
      } else {
        sql += " AND i.status = ?";
        params.push(status);
      }
    }

    sql += " ORDER BY i.invoice_date DESC";
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT i.*, c.contract_number, cl.company_name 
       FROM invoices i 
       LEFT JOIN contracts c ON i.contract_id = c.id 
       LEFT JOIN clients cl ON c.client_id = cl.id 
       WHERE i.id = ?`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Счет не найден" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      invoice_number,
      contract_id,
      invoice_date,
      due_date,
      amount,
      tax_amount,
      total_amount,
      status,
      notes,
    } = req.body;

    const [existing] = await pool.execute(
      "SELECT id FROM invoices WHERE invoice_number = ?",
      [invoice_number],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Счет с номером '${invoice_number}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      "INSERT INTO invoices (invoice_number, contract_id, invoice_date, due_date, amount, tax_amount, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        invoice_number,
        contract_id,
        invoice_date,
        due_date,
        amount,
        tax_amount || 0,
        total_amount,
        status || "pending",
        notes || null,
      ],
    );

    await logAudit(
      "INSERT",
      "invoices",
      `Создан счет: ${invoice_number}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Счет успешно создан",
      data: {
        id: result.insertId,
        invoice_number,
        contract_id,
        invoice_date,
        due_date,
        amount,
        tax_amount,
        total_amount,
        status,
        notes,
      },
    });
  } catch (error) {
    console.error("Ошибка создания счета:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      invoice_number,
      contract_id,
      invoice_date,
      due_date,
      amount,
      tax_amount,
      total_amount,
      status,
      notes,
      payment_date,
    } = req.body;

    const [existing] = await pool.execute(
      "SELECT id FROM invoices WHERE invoice_number = ? AND id != ?",
      [invoice_number, id],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Счет с номером '${invoice_number}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      "UPDATE invoices SET invoice_number = ?, contract_id = ?, invoice_date = ?, due_date = ?, amount = ?, tax_amount = ?, total_amount = ?, status = ?, notes = ?, payment_date = ? WHERE id = ?",
      [
        invoice_number,
        contract_id,
        invoice_date,
        due_date,
        amount,
        tax_amount || 0,
        total_amount,
        status,
        notes || null,
        payment_date || null,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Счет не найден" });
    }

    await logAudit(
      "UPDATE",
      "invoices",
      `Обновлен счет ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Счет успешно обновлен" });
  } catch (error) {
    console.error("Ошибка обновления счета:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id/pay", async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date } = req.body;

    const [result] = await pool.execute(
      "UPDATE invoices SET status = 'paid', payment_date = ? WHERE id = ? AND status = 'pending'",
      [payment_date || new Date().toISOString().split("T")[0], id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Счет не найден или уже оплачен" });
    }

    await logAudit(
      "UPDATE",
      "invoices",
      `Счет ID: ${id} отмечен как оплаченный`,
      "Администратор",
    );
    res.json({ success: true, message: "Счет отмечен как оплаченный" });
  } catch (error) {
    console.error("Ошибка обновления счета:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.execute("DELETE FROM invoices WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Счет не найден" });
    }

    await logAudit(
      "DELETE",
      "invoices",
      `Удален счет ID: ${req.params.id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Счет успешно удален" });
  } catch (error) {
    console.error("Ошибка удаления счета:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
