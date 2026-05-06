const express = require("express");
const router = express.Router();
const pool = require("../config/database");

router.get("/my-requests", async (req, res) => {
  try {
    const userInfo = req.cookies?.client_info;
    if (!userInfo) {
      return res.status(401).json({ success: false, error: "Не авторизован" });
    }

    let user;
    try {
      user = JSON.parse(userInfo);
    } catch {
      return res
        .status(401)
        .json({ success: false, error: "Ошибка данных пользователя" });
    }

    const [users] = await pool.execute(
      "SELECT email, phone, first_name, last_name FROM users WHERE id = ?",
      [user.id],
    );

    if (users.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Пользователь не найден" });
    }

    const dbUser = users[0];
    const userEmail = dbUser.email || user.email || "";
    const userPhone = dbUser.phone || user.phone || "";
    const userName =
      `${dbUser.first_name || ""} ${dbUser.last_name || ""}`.trim();

    console.log("Поиск заявок для:", {
      email: userEmail,
      phone: userPhone,
      name: userName,
    });

    let rows = [];

    if (userEmail) {
      const [result] = await pool.execute(
        "SELECT * FROM requests WHERE email = ? ORDER BY created_at DESC",
        [userEmail],
      );
      rows = result;
    } else if (userPhone) {
      const [result] = await pool.execute(
        "SELECT * FROM requests WHERE phone = ? ORDER BY created_at DESC",
        [userPhone],
      );
      rows = result;
    } else if (userName) {
      const [result] = await pool.execute(
        "SELECT * FROM requests WHERE full_name LIKE ? ORDER BY created_at DESC",
        [`%${userName}%`],
      );
      rows = result;
    }

    console.log("Найдено заявок:", rows.length);
    res.json(rows);
  } catch (error) {
    console.error("Ошибка в my-requests:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/info", async (req, res) => {
  try {
    const userInfo = req.cookies?.client_info;
    if (!userInfo) {
      return res.status(401).json({ success: false, error: "Не авторизован" });
    }

    const user = JSON.parse(userInfo);

    const [rows] = await pool.execute(
      "SELECT id, username, email, first_name, last_name, phone, created_at FROM users WHERE id = ?",
      [user.id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Пользователь не найден" });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("Ошибка в info:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
