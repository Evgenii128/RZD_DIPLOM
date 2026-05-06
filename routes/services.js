const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const logAudit = require("../utils/audit");

router.get("/", async (req, res) => {
  try {
    const { search, active } = req.query;
    let sql = "SELECT * FROM services WHERE 1=1";
    const params = [];

    if (active === "true") {
      sql += " AND is_active = true";
    }

    if (search) {
      sql += " AND (service_code LIKE ? OR service_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY service_code";
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM services WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Услуга не найдена" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      service_code,
      service_name,
      description,
      unit,
      base_price,
      is_active,
    } = req.body;

    const [existing] = await pool.execute(
      "SELECT id FROM services WHERE service_code = ?",
      [service_code],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Код услуги '${service_code}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      "INSERT INTO services (service_code, service_name, description, unit, base_price, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [
        service_code,
        service_name,
        description || null,
        unit,
        base_price,
        is_active !== undefined ? is_active : true,
      ],
    );

    await logAudit(
      "INSERT",
      "services",
      `Создана услуга: ${service_code} - ${service_name}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Услуга успешно добавлена",
      data: {
        id: result.insertId,
        service_code,
        service_name,
        description,
        unit,
        base_price,
        is_active,
      },
    });
  } catch (error) {
    console.error("Ошибка создания услуги:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_code,
      service_name,
      description,
      unit,
      base_price,
      is_active,
    } = req.body;

    const [existing] = await pool.execute(
      "SELECT id FROM services WHERE service_code = ? AND id != ?",
      [service_code, id],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Код услуги '${service_code}' уже используется`,
      });
    }

    const [result] = await pool.execute(
      "UPDATE services SET service_code = ?, service_name = ?, description = ?, unit = ?, base_price = ?, is_active = ? WHERE id = ?",
      [
        service_code,
        service_name,
        description || null,
        unit,
        base_price,
        is_active,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Услуга не найдена" });
    }

    await logAudit(
      "UPDATE",
      "services",
      `Обновлена услуга ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Услуга успешно обновлена" });
  } catch (error) {
    console.error("Ошибка обновления услуги:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [items] = await pool.execute(
      "SELECT id FROM price_list_items WHERE service_id = ?",
      [id],
    );
    if (items.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Нельзя удалить услугу, которая используется в прайс-листах",
      });
    }

    const [result] = await pool.execute("DELETE FROM services WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Услуга не найдена" });
    }

    await logAudit(
      "DELETE",
      "services",
      `Удалена услуга ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Услуга успешно удалена" });
  } catch (error) {
    console.error("Ошибка удаления услуги:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
