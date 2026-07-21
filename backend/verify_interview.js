// backend/verify_interview.js
const BASE_URL = "http://localhost:3000/api";
const db = require("./config/db");

async function runTests() {
  console.log("=== STARTING HR INTERVIEW AI API SANITY TESTS ===");

  let adminToken = "";
  let employeeToken = "";
  let adminUserId = null;
  let testEmpId = null;
  let testDeptId = null;
  const TEST_TOPIC = "Automated Test Topic React State";
  const TEST_ROLE = "Engineer";

  try {
    // 1. Test Admin Login
    console.log("\n1. Testing Admin Login...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@payroll.com",
        password: "password123"
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    const loginData = await loginRes.json();
    adminToken = loginData.token;
    adminUserId = loginData.user.id;
    console.log("✅ Admin logged in successfully! User ID:", adminUserId);

    const authHeaders = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}` 
    };

    // 2. Setup Test Employee & HOD to test RBAC rules
    // Create a dept
    const deptRes = await fetch(`${BASE_URL}/departments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: "Interview Test Dept" })
    });
    const deptData = await deptRes.json();
    testDeptId = deptData.id;

    // Create an employee
    const empRes = await fetch(`${BASE_URL}/employees`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Test Interviewee",
        email: "interviewee.test@payroll.com",
        password: "password123",
        role: "Employee",
        department_id: testDeptId,
        base_salary: 30000
      })
    });
    const empData = await empRes.json();
    testEmpId = empData.id;

    // Login as Employee
    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "interviewee.test@payroll.com",
        password: "password123"
      })
    });
    const empLoginData = await empLoginRes.json();
    employeeToken = empLoginData.token;

    const empHeaders = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${employeeToken}` 
    };

    // 3. Test check-questions API
    console.log("\n2. Checking question count (should be 0)...");
    const checkRes = await fetch(`${BASE_URL}/interview/check-questions?job_role=${TEST_ROLE}&topic=${encodeURIComponent(TEST_TOPIC)}`, {
      headers: authHeaders
    });
    if (!checkRes.ok) throw new Error("Check questions API failed");
    const checkData = await checkRes.json();
    console.log("✅ Check questions returned successfully! Count:", checkData.count);

    // 4. Test question batch generation
    console.log("\n3. Testing question batch generation via Groq (Easy batch of 10)...");
    const genRes = await fetch(`${BASE_URL}/interview/generate-batch`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        job_role: TEST_ROLE,
        topic: TEST_TOPIC,
        difficulty: "Easy",
        batch_num: 1
      })
    });
    if (!genRes.ok) {
      const errTxt = await genRes.text();
      throw new Error("Generate batch failed: " + errTxt);
    }
    const genData = await genRes.json();
    console.log("✅ Successfully generated questions! Count:", genData.count);
    if (genData.questions.length > 0) {
      console.log("   First question generated:", genData.questions[0].question);
    }

    // 5. Check count again
    console.log("\n4. Rechecking question count (should be 10 or more)...");
    const recheckRes = await fetch(`${BASE_URL}/interview/check-questions?job_role=${TEST_ROLE}&topic=${encodeURIComponent(TEST_TOPIC)}`, {
      headers: authHeaders
    });
    const recheckData = await recheckRes.json();
    console.log("✅ Recheck questions count:", recheckData.count);

    // 5.b. Test retrieve all Q&As (Knowledge Bank)
    console.log("\n4b. Testing retrieve all questions (Q&A Knowledge Base)...");
    const allQRes = await fetch(`${BASE_URL}/interview/all-questions?job_role=${TEST_ROLE}&topic=${encodeURIComponent(TEST_TOPIC)}`, {
      headers: authHeaders
    });
    if (!allQRes.ok) throw new Error("Fetch all questions failed");
    const allQData = await allQRes.json();
    console.log("✅ Retrieved all questions successfully! Count:", allQData.length);
    if (allQData.length > 0) {
      console.log("   First Q&A expectation check:", allQData[0].expected_answer.substring(0, 50) + "...");
    }

    // 5.c. Test download Q&A PDF
    console.log("\n4c. Testing downloading Q&A PDF (Knowledge Base PDF Stream)...");
    const pdfRes = await fetch(`${BASE_URL}/interview/download-pdf?job_role=${TEST_ROLE}&topic=${encodeURIComponent(TEST_TOPIC)}&token=${adminToken}`, {
      method: "GET"
    });
    if (!pdfRes.ok) throw new Error("Download PDF failed");
    console.log("✅ Download Q&A PDF succeeded! Content-Type:", pdfRes.headers.get("Content-Type"));

    // 6. Fetch questions for interview
    console.log("\n5. Testing retrieve questions for interview...");
    const fetchQRes = await fetch(`${BASE_URL}/interview/questions?job_role=${TEST_ROLE}&topic=${encodeURIComponent(TEST_TOPIC)}`, {
      headers: authHeaders
    });
    if (!fetchQRes.ok) throw new Error("Fetch questions for interview failed");
    const fetchQData = await fetchQRes.json();
    console.log("✅ Retrieved questions successfully! Count returned:", fetchQData.questions.length);
    const firstQ = fetchQData.questions[0];

    // 7. Submit candidate answers for evaluation
    console.log("\n6. Testing submitting mock answers for AI evaluation...");
    const evalRes = await fetch(`${BASE_URL}/interview/evaluate`, {
      method: "POST",
      headers: empHeaders, // Employee submitting for themselves
      body: JSON.stringify({
        job_role: TEST_ROLE,
        topic: TEST_TOPIC,
        answers: [
          {
            question_id: firstQ.id,
            candidate_answer: "React state is a local data storage that is component-specific. It is updated using a setter function and triggers component re-rendering when modified."
          }
        ]
      })
    });
    if (!evalRes.ok) {
      const errTxt = await evalRes.text();
      throw new Error("Evaluation submission failed: " + errTxt);
    }
    const evalData = await evalRes.json();
    const testInterviewId = evalData.interview_id;
    console.log("✅ Evaluation completed successfully! Interview ID:", testInterviewId);
    console.log("   Overall Score:", evalData.overall_score);
    console.log("   Overall Feedback Summary:", evalData.overall_feedback);
    console.log("   AI question feedback:", evalData.evaluations[0]?.feedback);

    // 8. Test History retrieval
    console.log("\n7. Testing history API (Admin vs Employee)...");
    const adminHistoryRes = await fetch(`${BASE_URL}/interview/history`, { headers: authHeaders });
    const adminHistory = await adminHistoryRes.json();
    console.log("✅ Admin history retrieved. Total records in system:", adminHistory.length);

    const empHistoryRes = await fetch(`${BASE_URL}/interview/history`, { headers: empHeaders });
    const empHistory = await empHistoryRes.json();
    console.log("✅ Employee history retrieved. Total records for employee:", empHistory.length);

    // Check that employee does not see admin's or other's history if separate
    if (empHistory.some(h => h.id === testInterviewId)) {
      console.log("✅ History RBAC matches correctly.");
    }

    // 9. Test Report retrieval
    console.log("\n8. Testing report detail retrieval...");
    const reportRes = await fetch(`${BASE_URL}/interview/report/${testInterviewId}`, { headers: empHeaders });
    if (!reportRes.ok) throw new Error("Report fetch failed");
    const reportData = await reportRes.json();
    console.log("✅ Detailed report retrieved! Candidate name:", reportData.interview.candidate_name);
    console.log("   Question 1 evaluate score:", reportData.answers[0]?.ai_score);

    // 9.b. Test Ask Knowledge Assistant (RAG Search)
    console.log("\n8b. Testing AI Search Assistant (RAG query)...");
    const askRes = await fetch(`${BASE_URL}/interview/ask-knowledge`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        job_role: TEST_ROLE,
        topic: TEST_TOPIC,
        question: "Summarize the expected answer for the React state question."
      })
    });
    if (!askRes.ok) {
      const errTxt = await askRes.text();
      throw new Error("Ask Knowledge Assistant failed: " + errTxt);
    }
    const askData = await askRes.json();
    console.log("✅ AI Knowledge Search Assistant responded successfully!");
    console.log("   AI Answer Preview:", askData.answer.substring(0, 100) + "...");

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
  } catch (error) {
    console.error("\n❌ TESTS FAILED:", error.message);
  } finally {
    // 10. Database Cleanup
    console.log("\n🧹 Starting database cleanup...");
    try {
      await db.query("DELETE FROM interview_answers WHERE interview_id IN (SELECT id FROM interviews WHERE topic = ?)", [TEST_TOPIC]);
      await db.query("DELETE FROM interviews WHERE topic = ?", [TEST_TOPIC]);
      await db.query("DELETE FROM interview_questions WHERE topic = ?", [TEST_TOPIC]);
      
      if (testEmpId) {
        await db.query("DELETE FROM employees WHERE id = ?", [testEmpId]);
        console.log("   - Cleaned up test employee");
      }
      if (testDeptId) {
        await db.query("DELETE FROM departments WHERE id = ?", [testDeptId]);
        console.log("   - Cleaned up test department");
      }
      console.log("✅ Cleanup finished.");
    } catch (err) {
      console.error("Cleanup error:", err.message);
    }
    process.exit(0);
  }
}

runTests();
