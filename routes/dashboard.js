const express = require("express");
const router = express.Router();
const pool = require("../config/database");

router.get("/stats", async (req, res) => {
  try {
    const [reqNew] = await pool.execute(
      "SELECT COUNT(*) as count FROM requests WHERE status = 'new'",
    );
    const [reqInProgress] = await pool.execute(
      "SELECT COUNT(*) as count FROM requests WHERE status = 'in_progress'",
    );
    const [reqCompleted] = await pool.execute(
      "SELECT COUNT(*) as count FROM requests WHERE status = 'completed'",
    );
    const [reqTotal] = await pool.execute(
      "SELECT COUNT(*) as count FROM requests",
    );
    const [clients] = await pool.execute(
      "SELECT COUNT(*) as count FROM clients",
    );
    const [services] = await pool.execute(
      "SELECT COUNT(*) as count FROM services WHERE is_active = true",
    );
    const [contracts] = await pool.execute(
      "SELECT COUNT(*) as count FROM contracts WHERE status = 'active'",
    );
    const [invoices] = await pool.execute(
      "SELECT COUNT(*) as count FROM invoices WHERE status = 'pending'",
    );
    const [totalRevenue] = await pool.execute(
      "SELECT SUM(total_amount) as total FROM invoices WHERE status = 'paid'",
    );

    res.json({
      newRequests: reqNew[0].count,
      inProgressRequests: reqInProgress[0].count,
      completedRequests: reqCompleted[0].count,
      totalRequests: reqTotal[0].count,
      clients: clients[0].count,
      services: services[0].count,
      activeContracts: contracts[0].count,
      pendingInvoices: invoices[0].count,
      totalRevenue: totalRevenue[0].total || 0,
    });
  } catch (error) {
    console.error("Ошибка статистики:", error);
    res.json({
      newRequests: 0,
      inProgressRequests: 0,
      completedRequests: 0,
      totalRequests: 0,
      clients: 0,
      services: 0,
      activeContracts: 0,
      pendingInvoices: 0,
      totalRevenue: 0,
    });
  }
});

module.exports = router;
