require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const checkAuth = require("./middleware/auth");
const initializeDatabase = require("./database/init");

const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const serviceRoutes = require("./routes/services");
const clientRoutes = require("./routes/clients");
const dashboardRoutes = require("./routes/dashboard");
const priceListRoutes = require("./routes/priceLists");
const contractRoutes = require("./routes/contracts");
const invoiceRoutes = require("./routes/invoices");
const publicRequestRoutes = require("./routes/publicRequests");
const clientAuthRoutes = require("./routes/clientAuth");
const profileRoutes = require("./routes/profile");
const usersRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(cookieParser());
app.use(checkAuth);

app.use("/api/admin", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/price-lists", priceListRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/public/requests", publicRequestRoutes);
app.use("/api/client", clientAuthRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/users", usersRoutes);

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html")),
);
app.get("/request", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "request.html")),
);
app.get("/admin", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin.html")),
);
app.get("/profile", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "profile.html")),
);
app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html")),
);
app.get("/register", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "register.html")),
);

app.get("/api/health", async (req, res) => {
  try {
    const pool = require("./config/database");
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT VERSION() as version");
    connection.release();
    res.json({
      status: "OK",
      database: { connected: true, version: rows[0].version },
    });
  } catch (error) {
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

async function startServer() {
  try {
    const pool = require("./config/database");
    const connection = await pool.getConnection();
    console.log("✅ Подключение к MySQL установлено!");
    connection.release();
    await initializeDatabase();
  } catch (err) {
    console.error("❌ Ошибка подключения к MySQL:", err.message);
  }

  app.listen(PORT, () => {
    console.log("=".repeat(60));
    console.log('🚀 СИСТЕМА "РЖД-ТЕХСЕРВИС" ЗАПУЩЕНА');
    console.log("=".repeat(60));
    console.log(`🌐 Главная страница:  http://localhost:${PORT}`);
    console.log(`📝 Подать заявление:  http://localhost:${PORT}/request`);
    console.log(`⚙️ Панель управления: http://localhost:${PORT}/admin`);
    console.log(`👤 Личный кабинет:    http://localhost:${PORT}/profile`);
    console.log("=".repeat(60));
    console.log("🔐 Данные для входа: admin / admin123");
    console.log("=".repeat(60));
  });
}

startServer();
