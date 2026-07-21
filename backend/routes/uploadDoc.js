const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse/lib/pdf-parse.js"); // ✅ fixed
const router = express.Router();
const db = require("../config/db");

const { authenticateToken } = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage() });

function chunkText(text, size = 200) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    const chunk = words.slice(i, i + size).join(" ");
    if (chunk.trim().length > 10) chunks.push(chunk);
  }
  return chunks;
}

router.post("/upload-doc", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const { emp_id } = req.body;
    if (!emp_id || !req.file)
      return res.status(400).json({ message: "Employee ID and file required" });

    // RBAC check
    const { role, id: userId, department_id: deptId } = req.user;
    if (role === "Employee" && parseInt(emp_id) !== userId) {
      return res.status(403).json({ message: "Access denied. Employees can only manage their own documents." });
    } else if (role === "HOD") {
      const [empRows] = await db.query("SELECT department_id FROM employees WHERE id = ?", [emp_id]);
      if (empRows.length === 0 || empRows[0].department_id !== deptId) {
        return res.status(403).json({ message: "Access denied. HOD can only manage department employee documents." });
      }
    }

    const parsed = await pdfParse(req.file.buffer);
    const chunks = chunkText(parsed.text);

    await db.query("DELETE FROM employee_doc_chunks WHERE emp_id = ?", [emp_id]);

    for (let i = 0; i < chunks.length; i++) {
      await db.query(
        "INSERT INTO employee_doc_chunks (emp_id, chunk_index, chunk_text) VALUES (?, ?, ?)",
        [emp_id, i, chunks[i]]
      );
    }

    res.json({ success: true, message: `Uploaded! ${chunks.length} sections stored.` });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

module.exports = router;