const mysql = require("mysql2/promise");
require("dotenv").config();

async function runMigration() {
  console.log("Starting HR Interview AI migrations...");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root123",
    database: process.env.DB_NAME || "payroll_db",
  });

  try {
    // Disable FK checks to safely drop/modify
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    // 1. Recreate interview_questions table
    console.log("Dropping and recreating 'interview_questions' table...");
    await connection.query("DROP TABLE IF EXISTS interview_questions;");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_role VARCHAR(50) NOT NULL,
        topic VARCHAR(100) NOT NULL,
        difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL,
        question TEXT NOT NULL,
        expected_answer TEXT NOT NULL,
        source_pdf VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Enable FK checks
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

    // 2. Create interviews table
    console.log("Creating 'interviews' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS interviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        job_role VARCHAR(50) NOT NULL,
        topic VARCHAR(100) NOT NULL,
        overall_score INT NULL,
        overall_feedback TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    // 3. Create interview_answers table
    console.log("Creating 'interview_answers' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        interview_id INT NOT NULL,
        question_id INT NOT NULL,
        candidate_answer TEXT NOT NULL,
        ai_score INT NOT NULL,
        ai_feedback TEXT NOT NULL,
        FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE
      )
    `);

    console.log("HR Interview AI migrations completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
