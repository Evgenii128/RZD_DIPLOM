const pool = require("../config/database");
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    console.log("🔄 Инициализация базы данных...");

    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_code VARCHAR(20) UNIQUE NOT NULL,
        service_name VARCHAR(200) NOT NULL,
        description TEXT,
        unit VARCHAR(20) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        company_name VARCHAR(100) DEFAULT NULL,
        contact_person VARCHAR(100),
        tax_number VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(100),
        legal_address TEXT,
        bank_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS price_lists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        price_list_name VARCHAR(100) NOT NULL,
        description TEXT,
        valid_from DATE NOT NULL,
        valid_to DATE DEFAULT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS price_list_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        price_list_id INT,
        service_id INT,
        price DECIMAL(10,2),
        FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_number VARCHAR(50) NOT NULL UNIQUE,
        client_id INT,
        price_list_id INT,
        contract_date DATE NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        total_amount DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
        FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE SET NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        contract_id INT,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        tax_amount DECIMAL(15,2),
        total_amount DECIMAL(15,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'client',
        first_name VARCHAR(50) DEFAULT NULL,
        last_name VARCHAR(50) DEFAULT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL DEFAULT NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_number VARCHAR(20) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        company_name VARCHAR(100),
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        service_description TEXT,
        selected_services JSON,
        total_amount DECIMAL(15,2) DEFAULT 0,
        preferred_date DATE,
        status ENUM('new', 'in_progress', 'completed', 'cancelled') DEFAULT 'new',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100),
        action VARCHAR(50),
        table_name VARCHAR(100),
        details TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");

    const [servicesCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM services",
    );
    if (servicesCount[0].count === 0) {
      await connection.execute(`
        INSERT INTO services (service_code, service_name, description, unit, base_price) VALUES 
        ('SERV-001', 'Техническое обслуживание оборудования', 'Плановое ТО железнодорожного оборудования', 'час', 1500.00),
        ('SERV-002', 'Ремонт путей', 'Восстановление железнодорожного полотна', 'м', 2500.00),
        ('SERV-003', 'Электромонтажные работы', 'Монтаж и обслуживание электрооборудования', 'услуга', 5000.00)
      `);
      console.log("✅ Демо-услуги добавлены");
    }

    const [usersCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE username = ?",
      ["admin"],
    );
    if (usersCount[0].count === 0) {
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || "admin123",
        10,
      );
      await connection.execute(
        "INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          "admin",
          "admin@rzd-tehservice.ru",
          hashedPassword,
          "admin",
          "Администратор",
          "Системы",
          true,
        ],
      );
      console.log("✅ Администратор создан");
    }

    console.log("✅ Инициализация БД завершена");
  } catch (error) {
    console.error("❌ Ошибка инициализации БД:", error.message);
  } finally {
    connection.release();
  }
}

module.exports = initializeDatabase;
