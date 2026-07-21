// backend/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, JWT_SECRET } = require("../middleware/auth");

// Login Endpoint
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const [rows] = await db.query(
      `SELECT e.*, d.name as department_name 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       WHERE e.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const employee = rows[0];

    // Verify Password
    const isMatch = await bcrypt.compare(password, employee.password || "");
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate Token
    const userPayload = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department_id: employee.department_id,
      department: employee.department || employee.department_name
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      message: "Login successful",
      token,
      user: userPayload
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Profile / Me Endpoint
router.get("/auth/me", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.name, e.email, e.role, e.base_salary, e.department_id, e.department, d.name as department_name, e.created_at
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User profile not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error fetching profile" });
  }
});

module.exports = router;
