// backend/routes/leaves.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

// GET leaves based on role
router.get("/leaves", authenticateToken, async (req, res) => {
  const { role, id: userId, department_id: deptId } = req.user;

  try {
    let query = `
      SELECT l.*, e.name as employee_name, d.name as department_name, appr.name as approved_by_name
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees appr ON l.approved_by = appr.id
    `;
    let params = [];

    if (role === "Employee") {
      query += " WHERE l.employee_id = ? ORDER BY l.id DESC";
      params.push(userId);
    } else if (role === "HOD") {
      query += " WHERE e.department_id = ? ORDER BY l.id DESC";
      params.push(deptId);
    } else {
      // Admin / HR Manager
      query += " ORDER BY l.id DESC";
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Fetch leaves error:", error);
    res.status(500).json({ error: "Server error fetching leaves" });
  }
});

// POST apply leave
router.post("/leaves", authenticateToken, async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  const employee_id = req.user.id;

  if (!leave_type || !start_date || !end_date) {
    return res.status(400).json({ error: "Leave type, start date and end date are required" });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [employee_id, leave_type, start_date, end_date, reason || ""]
    );

    // Get HOD of department to notify
    const [deptRows] = await db.query(
      `SELECT d.hod_id, d.name as dept_name 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       WHERE e.id = ?`,
      [employee_id]
    );

    const dept = deptRows[0];
    let notifyMessage = `New leave application (${leave_type}) from ${req.user.name} (${start_date} to ${end_date})`;

    if (dept && dept.hod_id) {
      // Notify HOD
      await db.query(
        "INSERT INTO notifications (employee_id, message) VALUES (?, ?)",
        [dept.hod_id, notifyMessage]
      );
    } else {
      // Notify general Admin/HR
      const [adminRows] = await db.query("SELECT id FROM employees WHERE role IN ('Admin', 'HR Manager')");
      for (const admin of adminRows) {
        await db.query(
          "INSERT INTO notifications (employee_id, message) VALUES (?, ?)",
          [admin.id, notifyMessage]
        );
      }
    }

    res.json({ message: "Leave applied successfully", id: result.insertId });
  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({ error: "Server error applying leave" });
  }
});

// PUT update leave status (Approve / Reject)
router.put("/leaves/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Approved' or 'Rejected'
  const { role, id: userId, department_id: deptId } = req.user;

  if (!["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value. Use 'Approved' or 'Rejected'" });
  }

  if (role === "Employee") {
    return res.status(403).json({ error: "Employees cannot approve or reject leaves" });
  }

  try {
    // Check if the leave exists and get employee department details
    const [leaveRows] = await db.query(
      `SELECT l.*, e.department_id, e.name as employee_name, e.id as emp_id
       FROM leaves l 
       JOIN employees e ON l.employee_id = e.id 
       WHERE l.id = ?`,
      [id]
    );

    if (leaveRows.length === 0) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    const leave = leaveRows[0];

    // RBAC logic: HOD can only manage their department employees
    if (role === "HOD" && leave.department_id !== deptId) {
      return res.status(403).json({ error: "Access denied. HOD can only approve leaves within their department." });
    }

    // Update leave status
    await db.query(
      "UPDATE leaves SET status = ?, approved_by = ? WHERE id = ?",
      [status, userId, id]
    );

    // Notify employee
    const message = `Your leave application from ${leave.start_date.toISOString().split('T')[0]} to ${leave.end_date.toISOString().split('T')[0]} has been ${status.toLowerCase()} by ${req.user.name}.`;
    await db.query(
      "INSERT INTO notifications (employee_id, message) VALUES (?, ?)",
      [leave.emp_id, message]
    );

    res.json({ message: `Leave request has been ${status.toLowerCase()}` });

  } catch (error) {
    console.error("Update leave error:", error);
    res.status(500).json({ error: "Server error updating leave status" });
  }
});

module.exports = router;
