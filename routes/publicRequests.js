const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { generateRequestNumber } = require("../utils/helpers");
const logAudit = require("../utils/audit");

router.post("/", async (req, res) => {
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
      return res
        .status(400)
        .json({ success: false, error: "Заполните все обязательные поля" });
    }

    if (
      !selected_services ||
      !Array.isArray(selected_services) ||
      selected_services.length === 0
    ) {
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

module.exports = router;
