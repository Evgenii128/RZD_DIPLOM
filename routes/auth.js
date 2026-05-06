const express = require("express");
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require("../config/database");
const logAudit = require("../utils/audit");

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, error: "Введите логин и пароль" });
  }

  try {
    const [users] = await pool.execute(
      "SELECT * FROM users WHERE username = ? AND is_active = 1",
      [username],
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

    res.cookie("admin_token", "authenticated", {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });

    res.cookie(
      "user_info",
      JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role,
        name:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.username,
      }),
      {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: false,
      },
    );

    await logAudit(
      "LOGIN",
      "users",
      `Вход пользователя: ${user.username}`,
      user.username,
    );

    res.json({
      success: true,
      message: "Вход выполнен успешно",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.username,
      },
    });
  } catch (error) {
    console.error("Ошибка при входе:", error);
    res.status(500).json({ success: false, error: "Ошибка сервера" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("admin_token");
  res.clearCookie("user_info");
  res.json({ success: true });
});

router.get("/check-auth", (req, res) => {
  const token = req.cookies?.admin_token;
  res.json({ authenticated: token === "authenticated" });
});

router.get("/current-user", (req, res) => {
  const userInfo = req.cookies?.user_info;
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
