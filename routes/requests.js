const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { generateRequestNumber } = require("../utils/helpers");
const logAudit = require("../utils/audit");

router.get("/", async (req, res) => {
  try {
    const { status, limit } = req.query;
    let sql = "SELECT * FROM requests";
    const params = [];

    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        sql += ` LIMIT ${limitNum}`;
      }
    }

    const [rows] = await pool.execute(sql, params);

    rows.forEach((row) => {
      if (row.selected_services && typeof row.selected_services === "string") {
        try {
          row.selected_services = JSON.parse(row.selected_services);
        } catch {
          row.selected_services = [];
        }
      }
    });

    res.json(rows);
  } catch (error) {
    console.error("Ошибка загрузки заявок:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res
        .status(400)
        .json({ success: false, error: "Некорректный ID заявки" });
    }

    const [rows] = await pool.execute("SELECT * FROM requests WHERE id = ?", [
      requestId,
    ]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Заявка не найдена" });
    }

    const request = rows[0];
    if (
      request.selected_services &&
      typeof request.selected_services === "string"
    ) {
      try {
        request.selected_services = JSON.parse(request.selected_services);
      } catch {
        request.selected_services = [];
      }
    }

    res.json(request);
  } catch (error) {
    console.error("Ошибка загрузки заявки:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/public", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      full_name,
      company_name,
      phone,
      email,
      preferred_date,
      selected_services,
      total_amount,
    } = req.body;

    if (!full_name || !phone || !email) {
      connection.release();
      return res
        .status(400)
        .json({ success: false, error: "Заполните все обязательные поля" });
    }

    if (
      !selected_services ||
      !Array.isArray(selected_services) ||
      selected_services.length === 0
    ) {
      connection.release();
      return res
        .status(400)
        .json({ success: false, error: "Выберите хотя бы одну услугу" });
    }

    await connection.beginTransaction();

    const requestNumber = await generateRequestNumber(connection);
    const serviceDescription = selected_services
      .map(
        (s) =>
          `${s.service_name} (x${s.quantity}) - ${Number(s.subtotal).toFixed(2)} ₽`,
      )
      .join("; ");

    const [result] = await connection.execute(
      `INSERT INTO requests (request_number, full_name, company_name, phone, email, 
       service_description, selected_services, total_amount, preferred_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [
        requestNumber,
        full_name,
        company_name || null,
        phone,
        email,
        serviceDescription,
        JSON.stringify(selected_services),
        Number(total_amount) || 0,
        preferred_date || null,
      ],
    );

    await connection.commit();

    await logAudit(
      "Клиент",
      "INSERT",
      "requests",
      `Новая заявка ${requestNumber} на сумму ${total_amount} ₽`,
    );

    res.status(201).json({
      success: true,
      message: "Ваша заявка успешно отправлена!",
      request_number: requestNumber,
      total_amount: total_amount,
      services_count: selected_services.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Ошибка создания заявки:", error);
    res
      .status(500)
      .json({ success: false, error: "Ошибка сервера при отправке заявки" });
  } finally {
    connection.release();
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res
        .status(400)
        .json({ success: false, error: "Некорректный ID заявки" });
    }

    const { status, admin_notes } = req.body;

    if (!status) {
      return res
        .status(400)
        .json({ success: false, error: "Статус не указан" });
    }

    const validStatuses = ["new", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, error: "Недопустимый статус" });
    }

    const [result] = await pool.execute(
      "UPDATE requests SET status = ?, admin_notes = ? WHERE id = ?",
      [status, admin_notes || null, requestId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Заявка не найдена" });
    }

    await logAudit(
      "UPDATE",
      "requests",
      `Статус заявки ID:${requestId} изменен на ${status}`,
      "Администратор",
    );
    res.json({ success: true, message: "Статус заявки обновлен" });
  } catch (error) {
    console.error("Ошибка обновления заявки:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);

    if (isNaN(requestId)) {
      return res
        .status(400)
        .json({ success: false, error: "Некорректный ID заявки" });
    }

    const [requests] = await pool.execute(
      "SELECT * FROM requests WHERE id = ?",
      [requestId],
    );
    if (requests.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Заявка не найдена" });
    }

    if (requests[0].status !== "new") {
      return res
        .status(400)
        .json({ success: false, error: "Можно удалять только новые заявки" });
    }

    const [result] = await pool.execute("DELETE FROM requests WHERE id = ?", [
      requestId,
    ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Не удалось удалить заявку" });
    }

    await logAudit(
      "DELETE",
      "requests",
      `Удалена заявка №${requests[0].request_number} (ID: ${requestId})`,
      "Администратор",
    );
    res.json({ success: true, message: "Заявка успешно удалена" });
  } catch (error) {
    console.error("Ошибка при удалении заявки:", error);
    res
      .status(500)
      .json({ success: false, error: "Внутренняя ошибка сервера" });
  }
});

module.exports = router;
