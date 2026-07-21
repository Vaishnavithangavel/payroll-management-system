import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import PageNavigation from "../components/PageNavigation";

export default function InterviewAI() {
  const { user } = useContext(AuthContext);

  // General States
  const [activeTab, setActiveTab] = useState("setup");
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Tab 1: Setup Question Bank States
  const [setupRole, setSetupRole] = useState("Engineer");
  const [setupTopic, setSetupTopic] = useState("");
  const [checkingBank, setCheckingBank] = useState(false);
  const [bankQuestionCount, setBankQuestionCount] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStatusText, setGenStatusText] = useState("");
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loadingBankQuestions, setLoadingBankQuestions] = useState(false);
  const [expandedQA, setExpandedQA] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [loadingAssistant, setLoadingAssistant] = useState(false);

  // Tab 2: Take Interview States
  const [intCandidateId, setIntCandidateId] = useState("");
  const [intRole, setIntRole] = useState("Engineer");
  const [intTopic, setIntTopic] = useState("");
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [errorQuestions, setErrorQuestions] = useState("");
  
  // Interview Execution States
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [candidateAnswers, setCandidateAnswers] = useState({}); // { question_id: answer }
  const [submittingInterview, setSubmittingInterview] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  // Tab 3: History & Reports States
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeReportId, setActiveReportId] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [loadingReportDetail, setLoadingReportDetail] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchHistory();
    // Default candidate to self if employee
    if (user && user.role === "Employee") {
      setIntCandidateId(user.id);
    }
  }, [user]);

  const fetchEmployees = async () => {
    if (user.role === "Employee") return;
    setLoadingEmployees(true);
    try {
      const res = await axios.get("https://payroll-backend-pakr.onrender.com/api/employees");
      setEmployees(res.data);
      if (res.data.length > 0) {
        setIntCandidateId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
    setLoadingEmployees(false);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get("https://payroll-backend-pakr.onrender.com/api/interview/history");
      setHistory(res.data);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
    setLoadingHistory(false);
  };

  const fetchBankQuestions = async (role, topic) => {
    setLoadingBankQuestions(true);
    setExpandedQA({});
    try {
      const res = await axios.get(
        `https://payroll-backend-pakr.onrender.com/api/interview/all-questions?job_role=${role}&topic=${encodeURIComponent(topic.trim())}`
      );
      setBankQuestions(res.data);
    } catch (err) {
      console.error("Error fetching bank questions:", err);
    }
    setLoadingBankQuestions(false);
  };

  // Check Question Bank Count
  const handleCheckQuestionBank = async () => {
    if (!setupTopic.trim()) {
      alert("Please enter a topic to check");
      return;
    }
    setCheckingBank(true);
    setBankQuestionCount(null);
    setBankQuestions([]);
    try {
      const res = await axios.get(
        `https://payroll-backend-pakr.onrender.com/api/interview/check-questions?job_role=${setupRole}&topic=${encodeURIComponent(setupTopic.trim())}`
      );
      setBankQuestionCount(res.data.count);
      if (res.data.count > 0) {
        await fetchBankQuestions(setupRole, setupTopic);
      }
    } catch (err) {
      alert("Failed to check question bank. Make sure backend is running.");
    }
    setCheckingBank(false);
  };

  // Generate 100 questions in 10 batches of 10
  const handleGenerateQuestions = async () => {
    if (!setupTopic.trim()) {
      alert("Please specify a topic first.");
      return;
    }
    setGenerating(true);
    setGenProgress(0);
    setGenStatusText("Starting generation...");
    setBankQuestions([]);

    // Setup batches: 3 Easy, 4 Medium, 3 Hard = 10 batches
    const batches = [
      { diff: "Easy", num: 1 },
      { diff: "Easy", num: 2 },
      { diff: "Easy", num: 3 },
      { diff: "Medium", num: 4 },
      { diff: "Medium", num: 5 },
      { diff: "Medium", num: 6 },
      { diff: "Medium", num: 7 },
      { diff: "Hard", num: 8 },
      { diff: "Hard", num: 9 },
      { diff: "Hard", num: 10 },
    ];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setGenStatusText(`Generating Batch ${batch.num}/10 (${batch.diff} difficulty)...`);
        
        await axios.post("https://payroll-backend-pakr.onrender.com/api/interview/generate-batch", {
          job_role: setupRole,
          topic: setupTopic.trim(),
          difficulty: batch.diff,
          batch_num: batch.num
        });

        setGenProgress(Math.round(((i + 1) / batches.length) * 100));
      }
      setGenStatusText("🎉 Successfully generated 100 interview questions!");
      // Recheck count
      const res = await axios.get(
        `https://payroll-backend-pakr.onrender.com/api/interview/check-questions?job_role=${setupRole}&topic=${encodeURIComponent(setupTopic.trim())}`
      );
      setBankQuestionCount(res.data.count);
      if (res.data.count > 0) {
        await fetchBankQuestions(setupRole, setupTopic);
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred during question generation: " + (err.response?.data?.error || err.message));
      setGenStatusText("❌ Question generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  // Start the interview
  const handleStartInterview = async () => {
    if (!intTopic.trim()) {
      alert("Please enter a topic to start the interview.");
      return;
    }
    setLoadingQuestions(true);
    setErrorQuestions("");
    setInterviewQuestions([]);
    setCandidateAnswers({});
    setCurrentQuestionIdx(0);
    setEvaluationResult(null);

    try {
      const res = await axios.get(
        `https://payroll-backend-pakr.onrender.com/api/interview/questions?job_role=${intRole}&topic=${encodeURIComponent(intTopic.trim())}`
      );
      setInterviewQuestions(res.data.questions);
      setInterviewStarted(true);
    } catch (err) {
      setErrorQuestions(err.response?.data?.error || "Failed to load questions. Make sure questions are generated first.");
    }
    setLoadingQuestions(false);
  };

  // Handle Candidate Answer Text Input
  const handleAnswerChange = (text) => {
    const activeQ = interviewQuestions[currentQuestionIdx];
    setCandidateAnswers(prev => ({
      ...prev,
      [activeQ.id]: text
    }));
  };

  // Submit Mock Interview Answers
  const handleSubmitInterview = async () => {
    setSubmittingInterview(true);
    try {
      // Build array of answers
      const answersArray = interviewQuestions.map(q => ({
        question_id: q.id,
        candidate_answer: candidateAnswers[q.id] || ""
      }));

      const res = await axios.post("https://payroll-backend-pakr.onrender.com/api/interview/evaluate", {
        employee_id: intCandidateId,
        job_role: intRole,
        topic: intTopic.trim(),
        answers: answersArray
      });

      setEvaluationResult(res.data);
      setInterviewStarted(false);
      // Refresh history list
      fetchHistory();
    } catch (err) {
      alert("Evaluation failed: " + (err.response?.data?.error || err.message));
    }
    setSubmittingInterview(false);
  };

  // View specific report
  const handleViewReport = async (reportId) => {
    setActiveReportId(reportId);
    setLoadingReportDetail(true);
    setReportDetail(null);
    try {
      const res = await axios.get(`https://payroll-backend-pakr.onrender.com/api/interview/report/${reportId}`);
      setReportDetail(res.data);
    } catch (err) {
      alert("Failed to load report detail: " + (err.response?.data?.error || err.message));
      setActiveReportId(null);
    }
    setLoadingReportDetail(false);
  };

  const filteredQuestions = bankQuestions.filter(q =>
    q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.expected_answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleQA = (id) => {
    setExpandedQA(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDownloadPDF = () => {
    const token = localStorage.getItem("payroll_token");
    const url = `https://payroll-backend-pakr.onrender.com/api/interview/download-pdf?job_role=${encodeURIComponent(setupRole)}&topic=${encodeURIComponent(setupTopic.trim())}&token=${token}`;
    window.open(url, "_blank");
  };

  const handleAskAssistant = async (e, customQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = customQuery || assistantQuery;
    if (!query.trim()) return;
    setLoadingAssistant(true);
    setAssistantResponse("");
    try {
      const res = await axios.post("https://payroll-backend-pakr.onrender.com/api/interview/ask-knowledge", {
        job_role: setupRole,
        topic: setupTopic.trim(),
        question: query.trim()
      });
      setAssistantResponse(res.data.answer);
    } catch (err) {
      alert("AI search query failed: " + (err.response?.data?.error || err.message));
    }
    setLoadingAssistant(false);
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(assistantResponse);
    alert("Copied response to clipboard!");
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#2ecc71";
    if (score >= 60) return "#3498db";
    return "#e74c3c";
  };

  const getDifficultyColor = (diff) => {
    if (diff === "Easy") return "#2ecc71";
    if (diff === "Medium") return "#f39c12";
    return "#e74c3c";
  };

  // Stylings
  const containerStyle = {
    padding: "40px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "'Inter', sans-serif"
  };

  const tabButtonStyle = (isActive) => ({
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    background: isActive ? "linear-gradient(135deg, #2c3e50, #3498db)" : "white",
    color: isActive ? "white" : "#555",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    transition: "0.2s"
  });

  return (
    <div style={containerStyle}>
      <h1 style={{ color: "#2c3e50", marginBottom: "8px", fontSize: "34px", fontWeight: "700" }}>
        🤖 HR Interview AI
      </h1>
      <p style={{ color: "#7f8c8d", marginBottom: "30px", fontSize: "15px" }}>
        Generate question banks, conduct interactive candidate mock tests, and analyze AI performance reports.
      </p>

      {/* Tabs Menu */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "30px", flexWrap: "wrap" }}>
        <button
          onClick={() => { setActiveTab("setup"); setActiveReportId(null); }}
          style={tabButtonStyle(activeTab === "setup")}
        >
          📚 Q&A Knowledge Bank
        </button>
        <button
          onClick={() => { setActiveTab("interview"); setActiveReportId(null); }}
          style={tabButtonStyle(activeTab === "interview")}
        >
          📝 Take Interview
        </button>
        <button
          onClick={() => { setActiveTab("history"); setActiveReportId(null); }}
          style={tabButtonStyle(activeTab === "history")}
        >
          📊 History & Reports
        </button>
      </div>

      {/* Report detail overlay/view */}
      {activeReportId && (
        <div style={{ background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#2c3e50", margin: 0 }}>📋 Interview Feedback Report</h2>
            <button
              onClick={() => setActiveReportId(null)}
              style={{
                backgroundColor: "#7f8c8d", color: "white", border: "none", padding: "8px 16px",
                borderRadius: "8px", cursor: "pointer", fontWeight: "600"
              }}
            >
              ⬅️ Back to List
            </button>
          </div>

          {loadingReportDetail && <div style={{ padding: "40px", color: "#aaa", textAlign: "center" }}>⏳ Loading report details...</div>}

          {!loadingReportDetail && reportDetail && (
            <div>
              {/* Summary Block */}
              <div style={{
                display: "flex", gap: "30px", flexWrap: "wrap", backgroundColor: "#f8f9fa",
                padding: "25px", borderRadius: "12px", borderLeft: "5px solid #3498db", marginBottom: "30px"
              }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ fontSize: "14px", color: "#7f8c8d" }}>CANDIDATE</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#2c3e50" }}>{reportDetail.interview.candidate_name}</div>
                  <div style={{ fontSize: "13px", color: "#95a5a6" }}>{reportDetail.interview.candidate_email}</div>
                  <div style={{ fontSize: "13px", color: "#95a5a6", marginTop: "4px" }}><b>Dept:</b> {reportDetail.interview.department_name || "General"}</div>
                </div>

                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ fontSize: "14px", color: "#7f8c8d" }}>ROLE & TOPIC</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#2c3e50" }}>{reportDetail.interview.job_role}</div>
                  <div style={{ fontSize: "14px", color: "#34495e" }}>Topic: <b>{reportDetail.interview.topic}</b></div>
                  <div style={{ fontSize: "12px", color: "#95a5a6" }}>Taken on {new Date(reportDetail.interview.created_at).toLocaleDateString()}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
                  <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "4px" }}>AI OVERALL SCORE</div>
                  <div style={{
                    fontSize: "36px", fontWeight: "800", color: getScoreColor(reportDetail.interview.overall_score),
                    background: "white", padding: "10px 20px", borderRadius: "10px", border: `2px solid ${getScoreColor(reportDetail.interview.overall_score)}`
                  }}>
                    {reportDetail.interview.overall_score}%
                  </div>
                </div>
              </div>

              {/* Overall Feedback */}
              <div style={{ marginBottom: "35px" }}>
                <h3 style={{ color: "#2c3e50", marginBottom: "10px" }}>💬 AI Recruiter Summary Feedback</h3>
                <div style={{
                  backgroundColor: "#eff6ff", color: "#1e3a8a", padding: "20px", borderRadius: "12px",
                  lineHeight: "1.6", fontSize: "15px", borderLeft: "4px solid #3b82f6"
                }}>
                  {reportDetail.interview.overall_feedback}
                </div>
              </div>

              {/* Question Breakdown */}
              <h3 style={{ color: "#2c3e50", marginBottom: "15px" }}>📝 Question-by-Question Evaluations</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {reportDetail.answers.map((ans, idx) => (
                  <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
                    {/* Header */}
                    <div style={{
                      backgroundColor: "#f8f9fa", padding: "16px 20px", borderBottom: "1px solid #e2e8f0",
                      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px"
                    }}>
                      <span style={{ fontWeight: "700", color: "#2c3e50" }}>Question {idx + 1}</span>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <span style={{
                          backgroundColor: `${getDifficultyColor(ans.difficulty)}1a`,
                          color: getDifficultyColor(ans.difficulty),
                          fontSize: "11px", fontWeight: "700", padding: "4px 8px", borderRadius: "6px"
                        }}>
                          {ans.difficulty}
                        </span>
                        <span style={{
                          backgroundColor: `${getScoreColor(ans.ai_score)}1a`,
                          color: getScoreColor(ans.ai_score),
                          fontSize: "11px", fontWeight: "700", padding: "4px 8px", borderRadius: "6px"
                        }}>
                          Score: {ans.ai_score}/100
                        </span>
                      </div>
                    </div>

                    {/* Question text */}
                    <div style={{ padding: "20px" }}>
                      <div style={{ fontWeight: "600", color: "#34495e", marginBottom: "12px" }}>Q: {ans.question}</div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "15px" }}>
                        <div>
                          <div style={{ fontSize: "12px", color: "#7f8c8d", fontWeight: "600", marginBottom: "4px" }}>CANDIDATE'S ANSWER:</div>
                          <div style={{
                            backgroundColor: "#fefefe", border: "1px solid #edf2f7", padding: "12px",
                            borderRadius: "8px", fontSize: "13.5px", color: "#4a5568", minHeight: "60px",
                            whiteSpace: "pre-line"
                          }}>
                            {ans.candidate_answer || "[Empty Answer]"}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "12px", color: "#7f8c8d", fontWeight: "600", marginBottom: "4px" }}>EXPECTED RESPONSE GUIDELINES:</div>
                          <div style={{
                            backgroundColor: "#f0fdf4", border: "1px solid #c6f6d5", padding: "12px",
                            borderRadius: "8px", fontSize: "13.5px", color: "#22543d", minHeight: "60px"
                          }}>
                            {ans.expected_answer}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: "15px", borderTop: "1px dashed #edf2f7", paddingTop: "15px" }}>
                        <div style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "700", marginBottom: "4px" }}>🤖 AI FEEDBACK:</div>
                        <div style={{ fontSize: "13.5px", color: "#4a5568", lineHeight: "1.5" }}>{ans.ai_feedback}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: Setup Question Bank */}
      {activeTab === "setup" && !activeReportId && (
        <div style={{ background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
          <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>📚 HR Q&A Knowledge Bank</h2>
          <p style={{ color: "#7f8c8d", fontSize: "14px", marginBottom: "25px", lineHeight: "1.5" }}>
            Select a job role and topic to retrieve stored questions and detailed answers.
            {user.role !== "Employee" && " If a question bank does not exist, you can generate 100 Q&As using Groq."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "25px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                JOB ROLE
              </label>
              <select
                value={setupRole}
                onChange={e => { setSetupRole(e.target.value); setBankQuestionCount(null); setBankQuestions([]); }}
                style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", outline: "none", fontSize: "14px" }}
              >
                <option value="Engineer">Engineer</option>
                <option value="Marketing">Marketing</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Sales">Sales</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                INTERVIEW TOPIC
              </label>
              <input
                type="text"
                placeholder="e.g. React hooks, SEO strategies, Financial modeling..."
                value={setupTopic}
                onChange={e => { setSetupTopic(e.target.value); setBankQuestionCount(null); setBankQuestions([]); }}
                style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleCheckQuestionBank}
              disabled={checkingBank || generating}
              style={{
                backgroundColor: "#34495e", color: "white", padding: "12px 24px", border: "none",
                borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px"
              }}
            >
              {checkingBank ? "🔍 Checking..." : "🔍 Check Existing Questions"}
            </button>

            {user.role !== "Employee" && bankQuestionCount !== null && (
              <button
                onClick={handleGenerateQuestions}
                disabled={generating}
                style={{
                  background: "linear-gradient(135deg, #e67e22, #d35400)", color: "white", padding: "12px 24px",
                  border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px",
                  boxShadow: "0 4px 10px rgba(230,126,34,0.2)"
                }}
              >
                {generating ? "⏳ Generating..." : bankQuestionCount > 0 ? "🔄 Regenerate 100 Questions Bank" : "✨ Generate 100 Questions Bank"}
              </button>
            )}
          </div>

          {/* Question Stats Result */}
          {bankQuestionCount !== null && !generating && (
            <div style={{
              marginTop: "25px", padding: "20px", borderRadius: "12px",
              backgroundColor: bankQuestionCount >= 100 ? "#e8fdf0" : "#fef3c7",
              border: bankQuestionCount >= 100 ? "1px solid #a3e635" : "1px solid #fde047",
              color: bankQuestionCount >= 100 ? "#14532d" : "#713f12"
            }}>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                {bankQuestionCount >= 100 ? "✅ Question Bank Ready" : "⚠️ Incomplete Question Bank"}
              </div>
              <div style={{ fontSize: "14px", marginTop: "4px" }}>
                We found <b>{bankQuestionCount} questions</b> in the bank for Job Role: <b>{setupRole}</b> and Topic: <b>{setupTopic}</b>.
                {bankQuestionCount < 100 && user.role !== "Employee" && " We recommend generating a full 100-question bank to enable optimal evaluation diversity."}
              </div>
            </div>
          )}

          {/* Generator Progress */}
          {generating && (
            <div style={{ marginTop: "30px", padding: "25px", border: "1px solid #edf2f7", borderRadius: "12px", backgroundColor: "#fafafa" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", color: "#2c3e50", marginBottom: "8px" }}>
                <span>🤖 AI Question Engine Running</span>
                <span>{genProgress}%</span>
              </div>
              <div style={{ width: "100%", height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden", marginBottom: "12px" }}>
                <div style={{ width: `${genProgress}%`, height: "100%", backgroundColor: "#e67e22", transition: "width 0.4s ease" }}></div>
              </div>
              <div style={{ fontSize: "13px", color: "#7f8c8d" }}>
                {genStatusText}
              </div>
              <div style={{ fontSize: "11px", color: "#95a5a6", marginTop: "6px" }}>
                💡 Tip: This runs in 10 sequential batches to stay within safe Groq API token boundaries. It takes around 15 seconds total. Do not refresh this page.
              </div>
            </div>
          )}

          {/* Q&A Knowledge Reference Content */}
          {bankQuestionCount > 0 && bankQuestions.length > 0 && !generating && (
            <div style={{ marginTop: "40px", borderTop: "2px solid #edf2f7", paddingTop: "30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "15px" }}>
                <div>
                  <h3 style={{ color: "#2c3e50", margin: 0, fontSize: "20px" }}>📚 Reference Q&A Repository ({bankQuestions.length} Items)</h3>
                  <p style={{ color: "#7f8c8d", fontSize: "13px", margin: "4px 0 0" }}>Study material and reference answers for {setupRole} - Topic: {setupTopic}</p>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  style={{
                    backgroundColor: "#e67e22", color: "white", border: "none", padding: "10px 20px",
                    borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px",
                    boxShadow: "0 4px 10px rgba(230,126,34,0.2)", display: "flex", alignItems: "center", gap: "8px"
                  }}
                >
                  📥 Download Q&A PDF
                </button>
              </div>

              {/* AI Search Assistant Panel */}
              <div style={{
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                padding: "25px",
                borderRadius: "16px",
                marginBottom: "30px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
                  <span style={{ fontSize: "28px" }}>🤖</span>
                  <div style={{ textAlign: "left" }}>
                    <h4 style={{ margin: 0, color: "#1e293b", fontSize: "16px", fontWeight: "700" }}>AI Knowledge Search Assistant</h4>
                    <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                      Ask questions, search details, or clarify concepts from the <b>{setupTopic}</b> Q&A bank.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAskAssistant} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder={`Ask ChatGPT-style questions (e.g. "What are the core pillars of ${setupTopic}?" or "Explain...")`}
                    value={assistantQuery}
                    onChange={e => setAssistantQuery(e.target.value)}
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      padding: "14px 18px",
                      border: "2px solid #cbd5e0",
                      borderRadius: "10px",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={e => e.target.style.borderColor = "#3498db"}
                    onBlur={e => e.target.style.borderColor = "#cbd5e0"}
                  />
                  <button
                    type="submit"
                    disabled={loadingAssistant || !assistantQuery.trim()}
                    style={{
                      background: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
                      color: "white",
                      border: "none",
                      padding: "14px 28px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      cursor: "pointer",
                      fontSize: "14px",
                      boxShadow: "0 4px 12px rgba(59,130,246,0.25)",
                      transition: "0.2s"
                    }}
                  >
                    {loadingAssistant ? "Thinking..." : "Ask AI"}
                  </button>
                </form>

                {/* Quick Suggestion Tags */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Suggestions:</span>
                  {[
                    `Summarize key takeaways of ${setupTopic}`,
                    `List important concepts`,
                    `Explain this topic for a beginner`
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAssistantQuery(s);
                        handleAskAssistant(null, s);
                      }}
                      style={{
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        color: "#475569",
                        cursor: "pointer",
                        fontWeight: "500",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        transition: "0.2s"
                      }}
                    >
                      💡 {s}
                    </button>
                  ))}
                </div>

                {/* Loading State */}
                {loadingAssistant && (
                  <div style={{
                    marginTop: "20px",
                    padding: "20px",
                    background: "white",
                    borderRadius: "12px",
                    border: "1px dashed #cbd5e0",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }} className="pulsing">
                    <div style={{
                      width: "18px",
                      height: "18px",
                      border: "3px solid #3b82f6",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }} />
                    <span style={{ color: "#475569", fontSize: "14px", fontWeight: "600" }}>Synthesizing knowledge repository...</span>
                  </div>
                )}

                {/* Response Output */}
                {assistantResponse && !loadingAssistant && (
                  <div style={{
                    marginTop: "20px",
                    padding: "20px",
                    background: "white",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                      <span style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "700", letterSpacing: "0.5px" }}>🤖 ASSISTANT RESPONSE</span>
                      <button
                        onClick={handleCopyResponse}
                        style={{
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px"
                        }}
                      >
                        📋 Copy Answer
                      </button>
                    </div>
                    <div style={{
                      fontSize: "14.5px",
                      color: "#334155",
                      lineHeight: "1.6",
                      whiteSpace: "pre-line",
                      textAlign: "left"
                    }}>
                      {assistantResponse}
                    </div>
                  </div>
                )}
              </div>

              {/* Search filter */}
              <div style={{ marginBottom: "20px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search questions or expected answers..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 16px", border: "2px solid #e2e8f0",
                    borderRadius: "8px", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Loader */}
              {loadingBankQuestions && (
                <div style={{ textAlign: "center", padding: "40px", color: "#aaa" }}>⏳ Fetching Q&A bank content...</div>
              )}

              {/* Questions list */}
              {!loadingBankQuestions && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxHeight: "600px", overflowY: "auto", paddingRight: "5px" }}>
                  {filteredQuestions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#a0aec0", fontStyle: "italic" }}>
                      No matching Q&As found.
                    </div>
                  ) : (
                    filteredQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "20px",
                          backgroundColor: "white",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                          textAlign: "left"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "15px" }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                            <span style={{ fontWeight: "800", color: "#3498db", fontSize: "15px" }}>Q{idx + 1}.</span>
                            <span style={{ fontWeight: "700", color: "#2c3e50", fontSize: "15px", lineHeight: "1.4" }}>{q.question}</span>
                          </div>
                          <span style={{
                            backgroundColor: `${getDifficultyColor(q.difficulty)}1a`,
                            color: getDifficultyColor(q.difficulty),
                            fontSize: "11px", fontWeight: "700", padding: "4px 8px", borderRadius: "6px",
                            whiteSpace: "nowrap"
                          }}>
                            {q.difficulty}
                          </span>
                        </div>
                        <div style={{ borderTop: "1px dashed #edf2f7", paddingTop: "12px" }}>
                          <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "700", marginBottom: "6px", letterSpacing: "0.5px" }}>
                            EXPECTED ANSWER / INFORMATION REFERENCE:
                          </div>
                          <div style={{ fontSize: "14px", color: "#4a5568", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                            {q.expected_answer}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Take Interview */}
      {activeTab === "interview" && !activeReportId && (
        <div style={{ background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
          {/* Start Screen */}
          {!interviewStarted && !evaluationResult && (
            <div>
              <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>📝 Start AI Candidate Interview</h2>
              <p style={{ color: "#7f8c8d", fontSize: "14px", marginBottom: "25px", lineHeight: "1.5" }}>
                Configure the candidate and topic. The AI will select a randomized test set of 5 questions (2 Easy, 2 Medium, 1 Hard) from the generated question bank.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "25px" }}>
                {user.role !== "Employee" ? (
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                      SELECT CANDIDATE
                    </label>
                    <select
                      value={intCandidateId}
                      onChange={e => setIntCandidateId(e.target.value)}
                      style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", outline: "none", fontSize: "14px" }}
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.department || "General"})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                      CANDIDATE
                    </label>
                    <input
                      type="text"
                      value={user.name}
                      disabled
                      style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", backgroundColor: "#f9f9f9", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                    JOB ROLE
                  </label>
                  <select
                    value={intRole}
                    onChange={e => setIntRole(e.target.value)}
                    style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", outline: "none", fontSize: "14px" }}
                  >
                    <option value="Engineer">Engineer</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                    INTERVIEW TOPIC
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the specific topic (must match setup topic exactly to retrieve questions)"
                    value={intTopic}
                    onChange={e => setIntTopic(e.target.value)}
                    style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {errorQuestions && (
                <div style={{
                  padding: "16px", borderRadius: "10px", backgroundColor: "#fde8e8",
                  color: "#e74c3c", border: "1px solid #f8b4b4", marginBottom: "20px", fontSize: "14px"
                }}>
                  ❌ {errorQuestions}
                </div>
              )}

              <button
                onClick={handleStartInterview}
                disabled={loadingQuestions}
                style={{
                  background: "linear-gradient(135deg, #2c3e50, #3498db)", color: "white", padding: "14px 30px",
                  border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "15px",
                  boxShadow: "0 4px 15px rgba(52,152,219,0.25)"
                }}
              >
                {loadingQuestions ? "⏳ Initializing test..." : "🚀 Launch Mock Interview"}
              </button>
            </div>
          )}

          {/* Active Interview Wizard */}
          {interviewStarted && interviewQuestions.length > 0 && (
            <div>
              {/* Wizard progress header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", borderBottom: "1px solid #eee", paddingBottom: "15px" }}>
                <div>
                  <span style={{ fontSize: "13px", color: "#888", fontWeight: "600" }}>CURRENT INTERVIEW</span>
                  <h3 style={{ margin: "2px 0 0", color: "#2c3e50" }}>{intRole} • {intTopic}</h3>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "13px", color: "#888", fontWeight: "600" }}>PROGRESS</span>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#3498db" }}>Question {currentQuestionIdx + 1} of {interviewQuestions.length}</div>
                </div>
              </div>

              {/* Active question layout */}
              <div style={{
                background: "#f8f9fa", border: "1px solid #e2e8f0", borderRadius: "12px",
                padding: "25px", marginBottom: "25px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <span style={{ fontSize: "12px", color: "#7f8c8d", fontWeight: "700" }}>QUESTION METRIC</span>
                  <span style={{
                    backgroundColor: `${getDifficultyColor(interviewQuestions[currentQuestionIdx].difficulty)}1a`,
                    color: getDifficultyColor(interviewQuestions[currentQuestionIdx].difficulty),
                    fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "6px"
                  }}>
                    {interviewQuestions[currentQuestionIdx].difficulty}
                  </span>
                </div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#2c3e50", lineHeight: "1.5" }}>
                  {interviewQuestions[currentQuestionIdx].question}
                </div>
              </div>

              {/* Answer entry textarea */}
              <div style={{ marginBottom: "25px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "8px" }}>
                  WRITE YOUR RESPONSE HERE
                </label>
                <textarea
                  placeholder="Explain your answer in detail. Mention key concepts, workflows, or code syntax if applicable..."
                  value={candidateAnswers[interviewQuestions[currentQuestionIdx].id] || ""}
                  onChange={e => handleAnswerChange(e.target.value)}
                  style={{
                    width: "100%", height: "200px", padding: "16px", border: "2px solid #cbd5e0",
                    borderRadius: "10px", outline: "none", fontSize: "14px", lineHeight: "1.6",
                    resize: "none", boxSizing: "border-box", transition: "border-color 0.2s"
                  }}
                  onFocus={e => e.target.style.borderColor = "#3498db"}
                  onBlur={e => e.target.style.borderColor = "#cbd5e0"}
                />
              </div>

              {/* Navigation buttons */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                  style={{
                    backgroundColor: "#e2e8f0", color: "#4a5568", border: "none", padding: "12px 24px",
                    borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px",
                    opacity: currentQuestionIdx === 0 ? 0.5 : 1
                  }}
                >
                  ⬅️ Previous
                </button>

                {currentQuestionIdx < interviewQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    style={{
                      backgroundColor: "#3498db", color: "white", border: "none", padding: "12px 24px",
                      borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px"
                    }}
                  >
                    Next ➡️
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitInterview}
                    disabled={submittingInterview}
                    style={{
                      background: "linear-gradient(135deg, #2ecc71, #27ae60)", color: "white", padding: "12px 30px",
                      border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px",
                      boxShadow: "0 4px 12px rgba(46,204,113,0.3)"
                    }}
                  >
                    🚀 Finish & Submit to AI
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submitting evaluation loading panel */}
          {submittingInterview && (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "50px", marginBottom: "20px", animation: "spin 2s linear infinite" }}>⏳</div>
              <h3 style={{ color: "#2c3e50", margin: "0 0 10px" }}>AI Recruiter Evaluating Answers...</h3>
              <p style={{ color: "#7f8c8d", fontSize: "14px", maxWidth: "450px", margin: "0 auto" }}>
                Groq is analyzing your technical answers against correct solutions, grading points, and writing feedback. This takes about 10-15 seconds...
              </p>
            </div>
          )}

          {/* AI Result Screen immediately following submission */}
          {evaluationResult && !interviewStarted && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "2px solid #eee", paddingBottom: "15px" }}>
                <h2 style={{ color: "#2c3e50", margin: 0 }}>🎉 Mock Interview Completed!</h2>
                <button
                  onClick={() => setEvaluationResult(null)}
                  style={{
                    backgroundColor: "#3498db", color: "white", border: "none", padding: "10px 20px",
                    borderRadius: "8px", cursor: "pointer", fontWeight: "600"
                  }}
                >
                  Conduct Another Interview
                </button>
              </div>

              {/* Stats Block */}
              <div style={{
                background: "linear-gradient(135deg, #2c3e50, #3498db)", color: "white",
                padding: "30px", borderRadius: "16px", boxShadow: "0 6px 15px rgba(52,152,219,0.25)",
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px",
                marginBottom: "30px"
              }}>
                <div>
                  <h3 style={{ margin: "0 0 5px", fontSize: "24px" }}>AI Assessment Score</h3>
                  <p style={{ margin: 0, opacity: 0.85, fontSize: "14px" }}>Role: {intRole} | Topic: {intTopic}</p>
                </div>
                <div style={{
                  fontSize: "44px", fontWeight: "800", background: "white", color: getScoreColor(evaluationResult.overall_score),
                  padding: "10px 30px", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
                }}>
                  {evaluationResult.overall_score}%
                </div>
              </div>

              {/* Feedback Summary */}
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#2c3e50", marginBottom: "10px" }}>📝 AI Evaluation Feedback</h3>
                <div style={{
                  backgroundColor: "#eff6ff", color: "#1e3a8a", padding: "20px", borderRadius: "12px",
                  fontSize: "15px", lineHeight: "1.6", borderLeft: "4px solid #3b82f6"
                }}>
                  {evaluationResult.overall_feedback}
                </div>
              </div>

              {/* Detailed Breakdown */}
              <h3 style={{ color: "#2c3e50", marginBottom: "15px" }}>📑 Review Answers</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {evaluationResult.evaluations.map((evalItem, idx) => {
                  const origQ = interviewQuestions.find(q => q.id === evalItem.question_id);
                  return (
                    <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", backgroundColor: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: "bold" }}>
                        <span style={{ color: "#2c3e50" }}>Question {idx + 1} ({origQ?.difficulty || "Medium"})</span>
                        <span style={{ color: getScoreColor(evalItem.score) }}>Score: {evalItem.score}/100</span>
                      </div>
                      <div style={{ fontSize: "14.5px", color: "#34495e", marginBottom: "12px" }}>Q: {origQ?.question}</div>
                      
                      <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "4px" }}>YOUR ANSWER:</div>
                      <div style={{
                        backgroundColor: "#f9fafb", padding: "10px", borderRadius: "6px",
                        fontSize: "13px", color: "#555", border: "1px solid #edf2f7", marginBottom: "12px"
                      }}>
                        {candidateAnswers[evalItem.question_id] || "[No Answer Provided]"}
                      </div>

                      <div style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "600", marginBottom: "4px" }}>AI FEEDBACK:</div>
                      <div style={{ fontSize: "13.5px", color: "#4b5563" }}>{evalItem.feedback}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: History & Reports */}
      {activeTab === "history" && !activeReportId && (
        <div style={{ background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#2c3e50", margin: 0 }}>📊 History of AI Evaluations</h2>
            <button
              onClick={fetchHistory}
              style={{
                backgroundColor: "#f0f2f5", color: "#555", border: "none", padding: "8px 16px",
                borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px"
              }}
            >
              🔄 Refresh List
            </button>
          </div>

          {loadingHistory && <div style={{ padding: "40px", color: "#aaa", textAlign: "center" }}>⏳ Fetching history log...</div>}

          {!loadingHistory && history.length === 0 && (
            <div style={{ padding: "40px", color: "#aaa", textAlign: "center" }}>
              📭 No interview history logs found yet. Start an interview to see reports here!
            </div>
          )}

          {!loadingHistory && history.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #edf2f7", color: "#7f8c8d", fontSize: "13px" }}>
                    {user.role !== "Employee" && <th style={{ padding: "12px 10px", textAlign: "left" }}>Candidate</th>}
                    <th style={{ padding: "12px 10px", textAlign: "left" }}>Job Role</th>
                    <th style={{ padding: "12px 10px", textAlign: "left" }}>Topic</th>
                    <th style={{ padding: "12px 10px", textAlign: "center" }}>Date</th>
                    <th style={{ padding: "12px 10px", textAlign: "center" }}>Score</th>
                    <th style={{ padding: "12px 10px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(row => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #edf2f7", fontSize: "14px" }}>
                      {user.role !== "Employee" && (
                        <td style={{ padding: "14px 10px", color: "#2d3748" }}>
                          <div><b>{row.candidate_name}</b></div>
                          <div style={{ fontSize: "11px", color: "#a0aec0" }}>{row.department_name || "General"}</div>
                        </td>
                      )}
                      <td style={{ padding: "14px 10px", color: "#4a5568", fontWeight: "600" }}>{row.job_role}</td>
                      <td style={{ padding: "14px 10px", color: "#4a5568" }}>{row.topic}</td>
                      <td style={{ padding: "14px 10px", color: "#718096", textAlign: "center" }}>
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "14px 10px", textAlign: "center" }}>
                        <span style={{
                          backgroundColor: `${getScoreColor(row.overall_score)}1a`,
                          color: getScoreColor(row.overall_score),
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontWeight: "700",
                          fontSize: "13px"
                        }}>
                          {row.overall_score}%
                        </span>
                      </td>
                      <td style={{ padding: "14px 10px", textAlign: "center" }}>
                        <button
                          onClick={() => handleViewReport(row.id)}
                          style={{
                            backgroundColor: "#3498db", color: "white", border: "none", padding: "6px 12px",
                            borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px"
                          }}
                        >
                          📄 View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Page Navigation footer component */}
      <PageNavigation
        prev={{
          path: "/",
          label: "Home"
        }}
      />
    </div>
  );
}
