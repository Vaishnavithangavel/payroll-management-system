// backend/routes/attendance.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, requireRoles } = require("../middleware/auth");

// GET attendance logs
router.get("/attendance", authenticateToken, async (req, res) => {
  const { role, id: userId, department_id: deptId } = req.user;
  const { start_date, end_date } = req.query;

  try {
    let query = `
      SELECT a.*, e.name as employee_name, d.name as department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
    `;
    let params = [];
    let conditions = [];

    if (role === "Employee") {
      conditions.push("a.employee_id = ?");
      params.push(userId);
    } else if (role === "HOD") {
      conditions.push("e.department_id = ?");
      params.push(deptId);
    }

    if (start_date && end_date) {
      conditions.push("a.date BETWEEN ? AND ?");
      params.push(start_date, end_date);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY a.date DESC, a.id DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Fetch attendance error:", error);
    res.status(500).json({ error: "Server error fetching attendance" });
  }
});

// GET current day attendance status for logged-in employee
router.get("/attendance/today", authenticateToken, async (req, res) => {
  const employeeId = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  try {
    const [rows] = await db.query(
      "SELECT * FROM attendance WHERE employee_id = ? AND date = ?",
      [employeeId, today]
    );

    if (rows.length === 0) {
      return res.json({ checkedIn: false, record: null });
    }

    res.json({ checkedIn: true, record: rows[0] });
  } catch (error) {
    console.error("Fetch today attendance error:", error);
    res.status(500).json({ error: "Server error checking today's attendance" });
  }
});

// POST clock-in / clock-out (for employee)
router.post("/attendance/clock", authenticateToken, async (req, res) => {
  const employeeId = req.user.id;
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const timeString = now.toTimeString().split(" ")[0]; // HH:MM:SS

  try {
    // Check if record exists
    const [rows] = await db.query(
      "SELECT * FROM attendance WHERE employee_id = ? AND date = ?",
      [employeeId, today]
    );

    if (rows.length === 0) {
      // Clock in
      await db.query(
        `INSERT INTO attendance (employee_id, date, status, clock_in)
         VALUES (?, ?, 'Present', ?)`,
        [employeeId, today, timeString]
      );
      res.json({ message: "Clock-in successful", checkedIn: true, clock_in: timeString });
    } else {
      const record = rows[0];
      if (record.clock_out) {
        return res.status(400).json({ error: "You have already clocked out for today" });
      }

      // Clock out
      await db.query(
        "UPDATE attendance SET clock_out = ? WHERE id = ?",
        [timeString, record.id]
      );
      res.json({ message: "Clock-out successful", checkedOut: true, clock_out: timeString });
    }
  } catch (error) {
    console.error("Clock error:", error);
    res.status(500).json({ error: "Server error clocking in/out" });
  }
});

// POST log attendance manually (Admin, HR Manager, HOD)
router.post("/attendance/manual", authenticateToken, async (req, res) => {
  const { employee_id, date, status, clock_in, clock_out } = req.body;
  const { role, department_id: loggedInDeptId } = req.user;

  if (role === "Employee") {
    return res.status(403).json({ error: "Access denied. Employees cannot manually log attendance." });
  }

  if (!employee_id || !date || !status) {
    return res.status(400).json({ error: "Employee ID, date, and status are required" });
  }

  try {
    // Check HOD department restriction
    if (role === "HOD") {
      const [empRows] = await db.query("SELECT department_id FROM employees WHERE id = ?", [employee_id]);
      if (empRows.length === 0 || empRows[0].department_id !== loggedInDeptId) {
        return res.status(403).json({ error: "Access denied. HOD can only manage attendance in their department." });
      }
    }

    // Insert or update attendance log
    await db.query(
      `INSERT INTO attendance (employee_id, date, status, clock_in, clock_out)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), clock_in = VALUES(clock_in), clock_out = VALUES(clock_out)`,
      [employee_id, date, status, clock_in || null, clock_out || null]
    );

    res.json({ message: "Attendance logged successfully" });
  } catch (error) {
    console.error("Manual attendance log error:", error);
    res.status(500).json({ error: "Server error logging attendance" });
  }
});

module.exports = router;
