const mysql = require("mysql2/promise");
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || "cfif31.ru",
  database: process.env.DB_NAME || "ISPr25-24_StreltsovEV_rzd",
  user: process.env.DB_USER || "ISPr25-24_StreltsovEV",
  password: process.env.DB_PASSWORD || "ISPr25-24_StreltsovEV",
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  maxIdle: 10,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
