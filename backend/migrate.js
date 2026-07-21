// backend/migrate.js
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function runMigration() {
  console.log("Starting database migrations...");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root123",
    database: process.env.DB_NAME || "payroll_db",
  });

  try {
    // 1. Create departments table
    console.log("Creating 'departments' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        hod_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Alter employees table to add RBAC and auth columns
    console.log("Altering 'employees' table for RBAC & auth...");
    
    // Check and add email
    const [emailCols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'email'
    `, [process.env.DB_NAME || "payroll_db"]);
    if (emailCols.length === 0) {
      await connection.query(`ALTER TABLE employees ADD COLUMN email VARCHAR(100) UNIQUE NULL`);
      console.log("- Added 'email' column");
    }

    // Check and add password
    const [passwordCols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'password'
    `, [process.env.DB_NAME || "payroll_db"]);
    if (passwordCols.length === 0) {
      await connection.query(`ALTER TABLE employees ADD COLUMN password VARCHAR(255) NULL`);
      console.log("- Added 'password' column");
    }

    // Check and add role
    const [roleCols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'role'
    `, [process.env.DB_NAME || "payroll_db"]);
    if (roleCols.length === 0) {
      await connection.query(`ALTER TABLE employees ADD COLUMN role ENUM('Admin', 'HR Manager', 'HOD', 'Employee') DEFAULT 'Employee' NOT NULL`);
      console.log("- Added 'role' column");
    }

    // Check and add department_id
    const [deptIdCols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'department_id'
    `, [process.env.DB_NAME || "payroll_db"]);
    if (deptIdCols.length === 0) {
      await connection.query(`ALTER TABLE employees ADD COLUMN department_id INT NULL`);
      await connection.query(`ALTER TABLE employees ADD CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL`);
      console.log("- Added 'department_id' column & foreign key");
    }

    // 3. Set foreign key for departments.hod_id referencing employees.id
    console.log("Setting foreign key for departments HOD...");
    try {
      await connection.query(`
        ALTER TABLE departments ADD CONSTRAINT fk_dept_hod FOREIGN KEY (hod_id) REFERENCES employees(id) ON DELETE SET NULL
      `);
      console.log("- Added HOD foreign key to departments");
    } catch (err) {
      // Constraint might already exist
      if (err.code !== 'ER_DUP_KEYNAME' && err.code !== 'ER_FK_DUP_NAME') {
        console.log("Note on departments HOD FK:", err.message);
      }
    }

    // 4. Create leaves table
    console.log("Creating 'leaves' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NULL,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending' NOT NULL,
        approved_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
      )
    `);

    // 5. Create attendance table
    console.log("Creating 'attendance' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        date DATE NOT NULL,
        status ENUM('Present', 'Absent', 'Leave', 'Half Day') NOT NULL,
        clock_in TIME NULL,
        clock_out TIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_emp_date (employee_id, date),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    // 6. Create notifications table
    console.log("Creating 'notifications' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    // 7. Seed standard departments
    console.log("Seeding departments...");
    const depts = ["HR", "Engineering", "Finance", "Marketing", "Sales", "Operations"];
    for (const d of depts) {
      await connection.query(`INSERT IGNORE INTO departments (name) VALUES (?)`, [d]);
    }

    // 8. Link existing employees to departments
    console.log("Linking existing employees to departments...");
    const [employeesList] = await connection.query(`SELECT id, department FROM employees`);
    for (const emp of employeesList) {
      if (emp.department) {
        // Find department ID
        const [deptRows] = await connection.query(`SELECT id FROM departments WHERE name = ?`, [emp.department]);
        if (deptRows.length > 0) {
          await connection.query(`UPDATE employees SET department_id = ? WHERE id = ?`, [deptRows[0].id, emp.id]);
        }
      }
    }

    // 9. Seed Admin user if not exists
    console.log("Seeding Administrator account...");
    const [adminRows] = await connection.query(`SELECT id FROM employees WHERE email = ?`, ["admin@payroll.com"]);
    if (adminRows.length === 0) {
      const hashedPassword = await bcrypt.hash("adminpassword", 10);
      await connection.query(`
        INSERT INTO employees (name, email, password, role, department, base_salary)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ["Admin User", "admin@payroll.com", hashedPassword, "Admin", "HR", 100000]);
      
      // Get that new admin employee ID and link it to the HR department
      const [newAdminRows] = await connection.query(`SELECT id FROM employees WHERE email = ?`, ["admin@payroll.com"]);
      if (newAdminRows.length > 0) {
        const [hrDeptRows] = await connection.query(`SELECT id FROM departments WHERE name = 'HR'`);
        if (hrDeptRows.length > 0) {
          await connection.query(`UPDATE employees SET department_id = ? WHERE id = ?`, [hrDeptRows[0].id, newAdminRows[0].id]);
        }
      }
      console.log("- Admin account seeded successfully (admin@payroll.com / adminpassword)");
    } else {
      console.log("- Admin account already exists");
    }

    console.log("Migrations successfully completed!");

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
