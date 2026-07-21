require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");
const router = express.Router();
const db = require("../config/db");

// Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const { authenticateToken } = require("../middleware/auth");

router.post("/ask-doc", authenticateToken, async (req, res) => {
  try {
    const { emp_id, question } = req.body;

    if (!emp_id || !question)
      return res.status(400).json({ message: "emp_id and question required" });

    // RBAC check
    const { role, id: userId, department_id: deptId } = req.user;
    if (role === "Employee" && parseInt(emp_id) !== userId) {
      return res.status(403).json({ message: "Access denied. Employees can only query their own documents." });
    } else if (role === "HOD") {
      const [empRows] = await db.query("SELECT department_id FROM employees WHERE id = ?", [emp_id]);
      if (empRows.length === 0 || empRows[0].department_id !== deptId) {
        return res.status(403).json({ message: "Access denied. HOD can only query department employee documents." });
      }
    }

    // Try FULLTEXT search first, fallback to normal query
    let context;
    try {
      const [rows] = await db.query(
        `SELECT chunk_text,
          MATCH(chunk_text) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
         FROM employee_doc_chunks
         WHERE emp_id = ?
         AND MATCH(chunk_text) AGAINST (? IN NATURAL LANGUAGE MODE)
         ORDER BY score DESC LIMIT 5`,
        [question, emp_id, question]
      );

      if (rows.length === 0) {
        const [allRows] = await db.query(
          "SELECT chunk_text FROM employee_doc_chunks WHERE emp_id = ? LIMIT 10",
          [emp_id]
        );
        if (allRows.length === 0)
          return res.json({ success: false, answer: "No document found. Please upload first." });
        context = allRows.map(r => r.chunk_text).join("\n\n");
      } else {
        context = rows.map(r => r.chunk_text).join("\n\n");
      }
    } catch (dbErr) {
      // Fallback if FULLTEXT index missing
      const [allRows] = await db.query(
        "SELECT chunk_text FROM employee_doc_chunks WHERE emp_id = ? LIMIT 10",
        [emp_id]
      );
      if (allRows.length === 0)
        return res.json({ success: false, answer: "No document found. Please upload first." });
      context = allRows.map(r => r.chunk_text).join("\n\n");
    }

    // Groq API call with specific employee context
    const prompt = `You are an HR assistant for TechSmart Solutions Pvt. Ltd.
The document below contains information for employee ID: ${emp_id}.
Use ONLY the employee document below to answer the question.
Be specific and concise. Give only the direct answer, no extra explanation.
If the answer is not found in the document, say "Information not found in document."

Employee Document:
${context}

Question: ${question}

Answer:`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.1
    });

    const answer = response.choices[0].message.content;
    res.json({ success: true, answer });

  } catch (err) {
    console.error("askDoc error:", err.message);
    res.status(500).json({ message: "Failed", error: err.message });
  }
});

module.exports = router;