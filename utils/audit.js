const pool = require("../config/database");

async function logAudit(action, tableName, details = "", username = "Система") {
  try {
    await pool.execute(
      "INSERT INTO audit_logs (username, action, table_name, details) VALUES (?, ?, ?, ?)",
      [username, action, tableName, details],
    );
  } catch (error) {
    console.log("⚠️ Не удалось записать лог:", error.message);
  }
}

module.exports = logAudit;
