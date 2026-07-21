// backend/routes/notifications.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

// GET notifications for logged in user
router.get("/notifications", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE employee_id = ? ORDER BY id DESC LIMIT 50",
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ error: "Server error fetching notifications" });
  }
});

// PUT mark notification as read
router.put("/notifications/:id/read", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND employee_id = ?",
      [id, userId]
    );
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Read notification error:", error);
    res.status(500).json({ error: "Server error updating notification" });
  }
});

// PUT mark all notifications as read
router.put("/notifications/read-all", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE employee_id = ?",
      [userId]
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Read all notifications error:", error);
    res.status(500).json({ error: "Server error updating notifications" });
  }
});

module.exports = router;
