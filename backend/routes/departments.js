// backend/routes/departments.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, requireRoles } = require("../middleware/auth");

// GET all departments with HOD details
router.get("/departments", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, e.name as hod_name, e.email as hod_email 
       FROM departments d 
       LEFT JOIN employees e ON d.hod_id = e.id
       ORDER BY d.name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error("Fetch departments error:", error);
    res.status(500).json({ error: "Server error fetching departments" });
  }
});

// POST create department (Admin / HR Manager only)
router.post("/departments", authenticateToken, requireRoles(["Admin", "HR Manager"]), async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Department name is required" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO departments (name) VALUES (?)",
      [name]
    );
    res.json({ message: "Department created successfully", id: result.insertId });
  } catch (error) {
    console.error("Create department error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Department name already exists" });
    }
    res.status(500).json({ error: "Server error creating department" });
  }
});

// PUT update department (Admin / HR Manager only)
router.put("/departments/:id", authenticateToken, requireRoles(["Admin", "HR Manager"]), async (req, res) => {
  const { id } = req.params;
  const { name, hod_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Department name is required" });
  }

  try {
    // Start transaction
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      // Get previous HOD if any
      const [prevDept] = await conn.query("SELECT hod_id FROM departments WHERE id = ?", [id]);
      const prevHodId = prevDept[0] ? prevDept[0].hod_id : null;

      // Update department
      await conn.query(
        "UPDATE departments SET name = ?, hod_id = ? WHERE id = ?",
        [name, hod_id || null, id]
      );

      // If HOD changed:
      if (hod_id && hod_id !== prevHodId) {
        // Demote previous HOD to Employee if they are not HOD of another department
        if (prevHodId) {
          const [otherDepts] = await conn.query("SELECT id FROM departments WHERE hod_id = ? AND id != ?", [prevHodId, id]);
          if (otherDepts.length === 0) {
            await conn.query("UPDATE employees SET role = 'Employee' WHERE id = ? AND role = 'HOD'", [prevHodId]);
          }
        }
        // Promote new HOD
        await conn.query("UPDATE employees SET role = 'HOD', department_id = ? WHERE id = ?", [id, hod_id]);
      } else if (!hod_id && prevHodId) {
        // HOD removed
        const [otherDepts] = await conn.query("SELECT id FROM departments WHERE hod_id = ?", [prevHodId]);
        if (otherDepts.length === 0) {
          await conn.query("UPDATE employees SET role = 'Employee' WHERE id = ? AND role = 'HOD'", [prevHodId]);
        }
      }

      await conn.commit();
      conn.release();
      res.json({ message: "Department updated successfully" });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (error) {
    console.error("Update department error:", error);
    res.status(500).json({ error: "Server error updating department" });
  }
});

// DELETE department (Admin / HR Manager only)
router.delete("/departments/:id", authenticateToken, requireRoles(["Admin", "HR Manager"]), async (req, res) => {
  const { id } = req.params;

  try {
    // Demote HOD to Employee first
    const [dept] = await db.query("SELECT hod_id FROM departments WHERE id = ?", [id]);
    const hodId = dept[0] ? dept[0].hod_id : null;

    if (hodId) {
      await db.query("UPDATE employees SET role = 'Employee' WHERE id = ? AND role = 'HOD'", [hodId]);
    }

    await db.query("DELETE FROM departments WHERE id = ?", [id]);
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Delete department error:", error);
    res.status(500).json({ error: "Server error deleting department" });
  }
});

module.exports = router;
