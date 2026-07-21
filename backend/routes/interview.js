const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const PDFDocument = require("pdfkit");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

// Instantiate Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Robust JSON extraction helper for AI outputs
function extractJSON(text) {
  const clean = text.trim();
  try {
    return JSON.parse(clean);
  } catch (err) {
    // Check for markdown blocks
    let jsonStr = clean;
    if (jsonStr.includes("```json")) {
      jsonStr = jsonStr.split("```json")[1].split("```")[0].trim();
    } else if (jsonStr.includes("```")) {
      jsonStr = jsonStr.split("```")[1].split("```")[0].trim();
    }
    try {
      return JSON.parse(jsonStr);
    } catch (err2) {
      // Direct array/object extraction fallback
      const startArr = jsonStr.indexOf("[");
      const endArr = jsonStr.lastIndexOf("]");
      if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
        try {
          return JSON.parse(jsonStr.substring(startArr, endArr + 1));
        } catch (e) {}
      }

      const startObj = jsonStr.indexOf("{");
      const endObj = jsonStr.lastIndexOf("}");
      if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
        try {
          return JSON.parse(jsonStr.substring(startObj, endObj + 1));
        } catch (e) {}
      }
      throw new Error("Could not parse JSON from AI response: " + text);
    }
  }
}

// 1. Check current generated question count for a job role and topic
router.get("/check-questions", authenticateToken, async (req, res) => {
  const { job_role, topic } = req.query;
  if (!job_role || !topic) {
    return res.status(400).json({ error: "job_role and topic query parameters are required" });
  }

  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS count FROM interview_questions WHERE job_role = ? AND topic = ?",
      [job_role, topic]
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error("check-questions error:", error);
    res.status(500).json({ error: "Failed to check question count" });
  }
});

// 2. Generate a batch of 10 questions using Groq
router.post("/generate-batch", authenticateToken, async (req, res) => {
  const { job_role, topic, difficulty, batch_num } = req.body;
  if (!job_role || !topic || !difficulty || !batch_num) {
    return res.status(400).json({ error: "job_role, topic, difficulty, and batch_num are required" });
  }

  // Allow HOD, HR Manager, Admin to generate questions
  if (req.user.role === "Employee") {
    return res.status(403).json({ error: "Access denied. Only Admins, HR Managers, or HODs can generate question banks." });
  }

  try {
    const prompt = `You are a professional HR Interviewer generating an interview question bank.
Generate exactly 10 interview questions and their detailed expected answers for the Job Role: "${job_role}" and Topic: "${topic}".
The difficulty level for all 10 questions in this batch must be "${difficulty}".

Output MUST be a valid JSON array of objects, and nothing else. Do not wrap the JSON in markdown code blocks like \`\`\`json, do not write any greetings or explanations.
Each object must contain EXACTLY the following keys:
- "question": string, the interview question.
- "expected_answer": string, detailed guidelines or exact points expected in a good answer.

Example structure:
[
  {
    "question": "What is state in React?",
    "expected_answer": "State is a built-in React object that stores data that may change over time..."
  }
]`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    const questionsList = extractJSON(content);

    if (!Array.isArray(questionsList)) {
      throw new Error("AI did not return a valid array of questions.");
    }

    // Insert questions into database
    for (const q of questionsList) {
      if (q.question && q.expected_answer) {
        await db.query(
          "INSERT INTO interview_questions (job_role, topic, difficulty, question, expected_answer) VALUES (?, ?, ?, ?, ?)",
          [job_role, topic, difficulty, q.question, q.expected_answer]
        );
      }
    }

    res.json({ success: true, count: questionsList.length, questions: questionsList });
  } catch (error) {
    console.error("generate-batch error:", error);
    res.status(500).json({ error: "Failed to generate question batch. " + error.message });
  }
});

// 3. Fetch questions to conduct the interview (5 random questions: 2 Easy, 2 Medium, 1 Hard)
router.get("/questions", authenticateToken, async (req, res) => {
  const { job_role, topic } = req.query;
  if (!job_role || !topic) {
    return res.status(400).json({ error: "job_role and topic query parameters are required" });
  }

  try {
    // Fetch 2 Easy
    const [easyRows] = await db.query(
      "SELECT id, question, difficulty FROM interview_questions WHERE job_role = ? AND topic = ? AND difficulty = 'Easy' ORDER BY RAND() LIMIT 2",
      [job_role, topic]
    );

    // Fetch 2 Medium
    const [mediumRows] = await db.query(
      "SELECT id, question, difficulty FROM interview_questions WHERE job_role = ? AND topic = ? AND difficulty = 'Medium' ORDER BY RAND() LIMIT 2",
      [job_role, topic]
    );

    // Fetch 1 Hard
    const [hardRows] = await db.query(
      "SELECT id, question, difficulty FROM interview_questions WHERE job_role = ? AND topic = ? AND difficulty = 'Hard' ORDER BY RAND() LIMIT 1",
      [job_role, topic]
    );

    let combined = [...easyRows, ...mediumRows, ...hardRows];

    // Fallback if we don't have enough difficulty-specific questions
    if (combined.length < 5) {
      const [allRows] = await db.query(
        "SELECT id, question, difficulty FROM interview_questions WHERE job_role = ? AND topic = ? ORDER BY RAND() LIMIT 5",
        [job_role, topic]
      );
      combined = allRows;
    }

    if (combined.length === 0) {
      return res.status(404).json({ error: "No questions found for this Job Role and Topic. Please generate questions first." });
    }

    res.json({ questions: combined });
  } catch (error) {
    console.error("fetch questions error:", error);
    res.status(500).json({ error: "Failed to retrieve interview questions" });
  }
});

// 4. Candidate Answer Evaluation
router.post("/evaluate", authenticateToken, async (req, res) => {
  const { employee_id, job_role, topic, answers } = req.body;
  if (!job_role || !topic || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: "job_role, topic, and answers (array) are required" });
  }

  // Resolve candidate employee id
  let candidateId = req.user.id;
  if (employee_id) {
    candidateId = parseInt(employee_id);
  }

  // RBAC checks for evaluation candidate
  if (req.user.role === "Employee" && candidateId !== req.user.id) {
    return res.status(403).json({ error: "Access denied. Employees can only evaluate their own interviews." });
  }

  if (req.user.role === "HOD") {
    // HOD can only evaluate department employees
    const [empRows] = await db.query("SELECT department_id FROM employees WHERE id = ?", [candidateId]);
    if (empRows.length === 0 || empRows[0].department_id !== req.user.department_id) {
      return res.status(403).json({ error: "Access denied. HOD can only conduct interviews for their own department employees." });
    }
  }

  try {
    // 1. Fetch questions + expected answers from DB for each answered question to feed Groq
    const answersWithDetails = [];
    for (const ans of answers) {
      const [qRows] = await db.query(
        "SELECT question, expected_answer, difficulty FROM interview_questions WHERE id = ?",
        [ans.question_id]
      );
      if (qRows.length > 0) {
        answersWithDetails.push({
          question_id: ans.question_id,
          question: qRows[0].question,
          difficulty: qRows[0].difficulty,
          expected_answer: qRows[0].expected_answer,
          candidate_answer: ans.candidate_answer || "[No Answer Provided]"
        });
      }
    }

    if (answersWithDetails.length === 0) {
      return res.status(400).json({ error: "No valid questions were answered" });
    }

    // 2. Formulate AI assessment prompt
    const prompt = `You are a professional HR recruiter. Evaluate the candidate's answers for the Job Role: "${job_role}" and Topic: "${topic}".
Below is the list of questions, the expected answers (rubric), and the candidate's answers:

${JSON.stringify(answersWithDetails, null, 2)}

Provide a score (0 to 100) and constructive feedback for each answer.
Also provide an overall score (0 to 100) and overall feedback summary for the entire interview.

Output MUST be a valid JSON object matching the following structure, and nothing else. Do not wrap in markdown or include intro/outro text:
{
  "overall_score": 78,
  "overall_feedback": "A summary of strengths and areas of improvement...",
  "evaluations": [
    {
      "question_id": 12,
      "score": 85,
      "feedback": "Your answer covered the main points, but lacked details about..."
    }
  ]
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const aiResult = extractJSON(response.choices[0].message.content);

    // 3. Save Master Interview record
    const [intResult] = await db.query(
      "INSERT INTO interviews (employee_id, job_role, topic, overall_score, overall_feedback) VALUES (?, ?, ?, ?, ?)",
      [candidateId, job_role, topic, aiResult.overall_score, aiResult.overall_feedback]
    );
    const interviewId = intResult.insertId;

    // 4. Save individual Answer Evaluations
    for (const evalItem of aiResult.evaluations) {
      const matchAns = answersWithDetails.find(d => d.question_id === evalItem.question_id);
      const candAns = matchAns ? matchAns.candidate_answer : "";
      await db.query(
        "INSERT INTO interview_answers (interview_id, question_id, candidate_answer, ai_score, ai_feedback) VALUES (?, ?, ?, ?, ?)",
        [interviewId, evalItem.question_id, candAns, evalItem.score, evalItem.feedback]
      );
    }

    // Insert notification for the employee
    const [candUser] = await db.query("SELECT name FROM employees WHERE id = ?", [candidateId]);
    const notificationMsg = `Your HR AI Interview for ${job_role} (${topic}) is evaluated. Score: ${aiResult.overall_score}%.`;
    await db.query("INSERT INTO notifications (employee_id, message) VALUES (?, ?)", [candidateId, notificationMsg]);

    res.json({
      interview_id: interviewId,
      overall_score: aiResult.overall_score,
      overall_feedback: aiResult.overall_feedback,
      evaluations: aiResult.evaluations
    });

  } catch (error) {
    console.error("Evaluation error:", error);
    res.status(500).json({ error: "Failed to evaluate candidate answers. " + error.message });
  }
});

// 5. Fetch Interview History
router.get("/history", authenticateToken, async (req, res) => {
  const { role, id: userId, department_id: deptId } = req.user;

  try {
    let query = "";
    let params = [];

    if (role === "Admin" || role === "HR Manager") {
      // Admin/HR can see all interviews
      query = `
        SELECT i.id, i.job_role, i.topic, i.overall_score, i.created_at, e.name AS candidate_name, d.name AS department_name
        FROM interviews i
        JOIN employees e ON i.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        ORDER BY i.created_at DESC
      `;
    } else if (role === "HOD") {
      // HOD can see interviews of their department employees
      query = `
        SELECT i.id, i.job_role, i.topic, i.overall_score, i.created_at, e.name AS candidate_name, d.name AS department_name
        FROM interviews i
        JOIN employees e ON i.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.department_id = ?
        ORDER BY i.created_at DESC
      `;
      params = [deptId];
    } else {
      // Employee can only see their own interviews
      query = `
        SELECT i.id, i.job_role, i.topic, i.overall_score, i.created_at, e.name AS candidate_name, d.name AS department_name
        FROM interviews i
        JOIN employees e ON i.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE i.employee_id = ?
        ORDER BY i.created_at DESC
      `;
      params = [userId];
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("fetch history error:", error);
    res.status(500).json({ error: "Failed to fetch interview history" });
  }
});

// 6. Fetch Detailed Interview Report
router.get("/report/:id", authenticateToken, async (req, res) => {
  const { role, id: userId, department_id: deptId } = req.user;
  const interviewId = parseInt(req.params.id);

  try {
    // Fetch master record
    const [intRows] = await db.query(
      `SELECT i.id, i.employee_id, i.job_role, i.topic, i.overall_score, i.overall_feedback, i.created_at, 
              e.name AS candidate_name, e.email AS candidate_email, d.name AS department_name
       FROM interviews i
       JOIN employees e ON i.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE i.id = ?`,
      [interviewId]
    );

    if (intRows.length === 0) {
      return res.status(404).json({ error: "Interview report not found." });
    }

    const interview = intRows[0];

    // RBAC validation on report access
    if (role === "Employee" && interview.employee_id !== userId) {
      return res.status(403).json({ error: "Access denied. You can only view your own interview reports." });
    }

    if (role === "HOD") {
      const [empRows] = await db.query("SELECT department_id FROM employees WHERE id = ?", [interview.employee_id]);
      if (empRows.length === 0 || empRows[0].department_id !== deptId) {
        return res.status(403).json({ error: "Access denied. HOD can only view department employee reports." });
      }
    }

    // Fetch individual evaluations
    const [ansRows] = await db.query(
      `SELECT ia.candidate_answer, ia.ai_score, ia.ai_feedback, q.question, q.expected_answer, q.difficulty
       FROM interview_answers ia
       JOIN interview_questions q ON ia.question_id = q.id
       WHERE ia.interview_id = ?`,
      [interviewId]
    );

    res.json({
      interview,
      answers: ansRows
    });
  } catch (error) {
    console.error("fetch report error:", error);
    res.status(500).json({ error: "Failed to fetch interview report" });
  }
});

// 7. Get all Q&As for a job role and topic
router.get("/all-questions", authenticateToken, async (req, res) => {
  const { job_role, topic } = req.query;
  if (!job_role || !topic) {
    return res.status(400).json({ error: "job_role and topic query parameters are required" });
  }

  try {
    const [rows] = await db.query(
      "SELECT id, question, expected_answer, difficulty FROM interview_questions WHERE job_role = ? AND topic = ? ORDER BY id ASC",
      [job_role, topic]
    );
    res.json(rows);
  } catch (error) {
    console.error("fetch all questions error:", error);
    res.status(500).json({ error: "Failed to retrieve all questions" });
  }
});

// 8. Download Q&A Bank PDF
router.get("/download-pdf", authenticateToken, async (req, res) => {
  const { job_role, topic } = req.query;
  if (!job_role || !topic) {
    return res.status(400).json({ error: "job_role and topic are required" });
  }

  try {
    const [questions] = await db.query(
      "SELECT question, expected_answer, difficulty FROM interview_questions WHERE job_role = ? AND topic = ? ORDER BY id ASC",
      [job_role, topic]
    );

    if (questions.length === 0) {
      return res.status(404).json({ error: "No questions found to generate PDF." });
    }

    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const filename = `QA_Bank_${job_role.replace(/\s+/g, "_")}_${topic.replace(/\s+/g, "_")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    doc.pipe(res);

    // Title Block
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#2c3e50")
      .text("HR KNOWLEDGE REPOSITORY", { align: "center" });
    doc.moveDown(0.4);
    doc.fontSize(14).font("Helvetica").fillColor("#7f8c8d")
      .text(`Job Role: ${job_role} | Topic: ${topic}`, { align: "center" });
    doc.moveDown(0.4);
    doc.fontSize(10).text(`Total Questions: ${questions.length} | Generated on: ${new Date().toLocaleDateString()}`, { align: "center" });

    doc.moveTo(50, doc.y + 15).lineTo(545, doc.y + 15).strokeColor("#3498db").lineWidth(2).stroke();
    doc.moveDown(2.5);

    // Render Questions
    questions.forEach((q, index) => {
      // Check pagination threshold
      if (doc.y > 680) {
        doc.addPage();
      }

      doc.fontSize(11).font("Helvetica-Bold").fillColor("#2c3e50")
        .text(`Q${index + 1}. ${q.question} [Difficulty: ${q.difficulty}]`, { paragraphGap: 6 });

      doc.fontSize(10).font("Helvetica-Bold").fillColor("#34495e")
        .text("Expected Answer:", { paragraphGap: 4 });

      doc.fontSize(9.5).font("Helvetica").fillColor("#4a5568")
        .text(q.expected_answer, { paragraphGap: 18, indent: 15 });
    });

    // Add page footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor("#a0aec0")
        .text(`Page ${i + 1} of ${pages.count} • HR Knowledge System`, 50, 780, { align: "center" });
    }

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: "Failed to generate Q&A PDF" });
  }
});

// 9. Natural Language Search / ChatGPT-style RAG Ask Assistant
router.post("/ask-knowledge", authenticateToken, async (req, res) => {
  const { job_role, topic, question } = req.body;
  if (!job_role || !topic || !question) {
    return res.status(400).json({ error: "job_role, topic, and question are required" });
  }

  try {
    // 1. Fetch Q&As for the job role & topic from database to use as reference context
    const [rows] = await db.query(
      "SELECT question, expected_answer FROM interview_questions WHERE job_role = ? AND topic = ? ORDER BY id ASC",
      [job_role, topic]
    );

    let contextText = "";
    if (rows.length > 0) {
      contextText = rows.map((r, i) => `Q${i+1}: ${r.question}\nAnswer Reference: ${r.expected_answer}`).join("\n\n");
    } else {
      contextText = "[No specific Q&A repository found for this topic. Use general knowledge to help the user.]";
    }

    // 2. Build Groq prompt
    const prompt = `You are a helpful HR Knowledge AI Assistant. You have access to the department's Q&A knowledge repository for the Job Role: "${job_role}" and Topic: "${topic}".
Use the following Q&A reference content as your main source of truth to answer the user's question. If the reference content does not contain the answer, you can supplement it with your general knowledge, but maintain a highly professional, constructive, and clear tone.

Q&A Reference Content:
${contextText}

User Question: "${question}"

Provide a detailed, clear, and comprehensive response. Use standard clear spacing. Do not include meta text.
Answer:`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 2500,
    });

    const answer = response.choices[0].message.content.trim();
    res.json({ answer });
  } catch (error) {
    console.error("ask-knowledge error:", error);
    res.status(500).json({ error: "Failed to query the AI assistant. " + error.message });
  }
});

module.exports = router;
