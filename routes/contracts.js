const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const logAudit = require("../utils/audit");

router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    let sql =
      "SELECT c.*, cl.company_name, cl.contact_person FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE 1=1";
    const params = [];

    if (status) {
      sql += " AND c.status = ?";
      params.push(status);
    }

    sql += " ORDER BY c.contract_date DESC";
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT c.*, cl.company_name, cl.contact_person FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE c.id = ?",
      [req.params.id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Договор не найден" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      contract_number,
      client_id,
      price_list_id,
      contract_date,
      start_date,
      end_date,
      total_amount,
      status,
    } = req.body;

    const [existing] = await pool.execute(
      "SELECT id FROM contracts WHERE contract_number = ?",
      [contract_number],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Договор с номером '${contract_number}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      "INSERT INTO contracts (contract_number, client_id, price_list_id, contract_date, start_date, end_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        contract_number,
        client_id,
        price_list_id || null,
        contract_date,
        start_date,
        end_date || null,
        total_amount || 0,
        status || "active",
      ],
    );

    await logAudit(
      "INSERT",
      "contracts",
      `Создан договор: ${contract_number}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Договор успешно создан",
      data: {
        id: result.insertId,
        contract_number,
        client_id,
        price_list_id,
        contract_date,
        start_date,
        end_date,
        total_amount,
        status,
      },
    });
  } catch (error) {
    console.error("Ошибка создания договора:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_number,
      client_id,
      price_list_id,
      contract_date,
      start_date,
      end_date,
      total_amount,
      status,
    } = req.body;

    const [existing] = await pool.execute(
      "SELECT id FROM contracts WHERE contract_number = ? AND id != ?",
      [contract_number, id],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Договор с номером '${contract_number}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      "UPDATE contracts SET contract_number = ?, client_id = ?, price_list_id = ?, contract_date = ?, start_date = ?, end_date = ?, total_amount = ?, status = ? WHERE id = ?",
      [
        contract_number,
        client_id,
        price_list_id || null,
        contract_date,
        start_date,
        end_date || null,
        total_amount || 0,
        status,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Договор не найден" });
    }

    await logAudit(
      "UPDATE",
      "contracts",
      `Обновлен договор ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Договор успешно обновлен" });
  } catch (error) {
    console.error("Ошибка обновления договора:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [invoices] = await pool.execute(
      "SELECT id FROM invoices WHERE contract_id = ?",
      [id],
    );
    if (invoices.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Нельзя удалить договор, у которого есть счета",
      });
    }

    const [result] = await pool.execute("DELETE FROM contracts WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Договор не найден" });
    }

    await logAudit(
      "DELETE",
      "contracts",
      `Удален договор ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Договор успешно удален" });
  } catch (error) {
    console.error("Ошибка удаления договора:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
