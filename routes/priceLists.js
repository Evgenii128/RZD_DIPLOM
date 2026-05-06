const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const logAudit = require("../utils/audit");

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM price_lists ORDER BY valid_from DESC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM price_lists WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Прайс-лист не найден" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { price_list_name, description, valid_from, valid_to, is_active } =
      req.body;

    const [result] = await pool.execute(
      "INSERT INTO price_lists (price_list_name, description, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?)",
      [
        price_list_name,
        description || null,
        valid_from,
        valid_to || null,
        is_active !== undefined ? is_active : true,
      ],
    );

    await logAudit(
      "INSERT",
      "price_lists",
      `Создан прайс-лист: ${price_list_name}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Прайс-лист успешно создан",
      data: {
        id: result.insertId,
        price_list_name,
        description,
        valid_from,
        valid_to,
        is_active,
      },
    });
  } catch (error) {
    console.error("Ошибка создания прайс-листа:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { price_list_name, description, valid_from, valid_to, is_active } =
      req.body;

    const [result] = await pool.execute(
      "UPDATE price_lists SET price_list_name = ?, description = ?, valid_from = ?, valid_to = ?, is_active = ? WHERE id = ?",
      [
        price_list_name,
        description || null,
        valid_from,
        valid_to || null,
        is_active,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Прайс-лист не найден" });
    }

    await logAudit(
      "UPDATE",
      "price_lists",
      `Обновлен прайс-лист ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Прайс-лист успешно обновлен" });
  } catch (error) {
    console.error("Ошибка обновления прайс-листа:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [contracts] = await pool.execute(
      "SELECT id FROM contracts WHERE price_list_id = ?",
      [id],
    );
    if (contracts.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Нельзя удалить прайс-лист, который используется в договорах",
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM price_lists WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Прайс-лист не найден" });
    }

    await logAudit(
      "DELETE",
      "price_lists",
      `Удален прайс-лист ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Прайс-лист успешно удален" });
  } catch (error) {
    console.error("Ошибка удаления прайс-листа:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:priceListId/items", async (req, res) => {
  try {
    const { priceListId } = req.params;
    const [rows] = await pool.execute(
      `SELECT pli.*, s.service_name, s.service_code, s.unit, s.base_price as default_price
       FROM price_list_items pli
       JOIN services s ON pli.service_id = s.id
       WHERE pli.price_list_id = ?`,
      [priceListId],
    );
    res.json(rows);
  } catch (error) {
    console.error("Ошибка загрузки позиций прайс-листа:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:priceListId/items", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { priceListId } = req.params;
    const { items } = req.body;

    await connection.beginTransaction();

    await connection.execute(
      "DELETE FROM price_list_items WHERE price_list_id = ?",
      [priceListId],
    );

    if (items && items.length > 0) {
      for (const item of items) {
        await connection.execute(
          "INSERT INTO price_list_items (price_list_id, service_id, price) VALUES (?, ?, ?)",
          [priceListId, item.service_id, item.price],
        );
      }
    }

    await connection.commit();

    await logAudit(
      "UPDATE",
      "price_list_items",
      `Обновлены позиции прайс-листа ID: ${priceListId}`,
      "Администратор",
    );
    res.json({ success: true, message: "Позиции прайс-листа сохранены" });
  } catch (error) {
    await connection.rollback();
    console.error("Ошибка сохранения позиций прайс-листа:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
