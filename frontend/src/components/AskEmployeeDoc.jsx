import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

export default function AskEmployeeDoc() {
  const { user, token } = useContext(AuthContext);
  const [empId, setEmpId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quickQuestions = [
    "What is the employee designation?",
    "What is the basic salary?",
    "What is the department?",
    "What is the phone number?",
    "What is the joining date?",
    "What is the email address?",
  ];

  useEffect(() => {
    fetchAllowedEmployees();
  }, []);

  const fetchAllowedEmployees = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/employees");
      setEmployees(res.data);
      if (res.data.length > 0) {
        setEmpId(res.data[0].id.toString());
      }
    } catch (err) {
      console.error("Error fetching allowed employees:", err);
    }
  };

  const handleAsk = async (q = question) => {
    if (!empId) return setError("Please select an employee");
    if (!q.trim()) return setError("Please enter a question");

    setLoading(true);
    setAnswer("");
    setError("");

    try {
      const res = await fetch("/api/ask-doc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emp_id: empId, question: q }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAnswer(data.answer);
      } else {
        setError(data.answer || data.message || "Failed to find answer.");
      }
    } catch (err) {
      setError("❌ Failed to query AI. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    background: "white",
  };

  return (
    <div style={{ padding: "10px", fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#2c3e50", margin: "0 0 15px", fontSize: "18px" }}>🤖 Ask About Employee Documents</h3>

      {user?.role !== "Employee" ? (
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: "600", fontSize: "13px", color: "#555" }}>
            Select Employee
          </label>
          <select value={empId} onChange={(e) => setEmpId(e.target.value)} style={selectStyle}>
            <option value="">-- Select Employee --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.department || "No Dept"})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{ marginBottom: 15, padding: "10px 12px", background: "#e8f4fd", borderRadius: 6, fontSize: "13px", color: "#2980b9" }}>
          Querying document for: <b>{user.name}</b>
        </div>
      )}

      <div style={{ marginBottom: 15 }}>
        <label style={{ display: "block", marginBottom: 5, fontWeight: "600", fontSize: "13px", color: "#555" }}>
          Your Question
        </label>
        <input
          type="text"
          placeholder="e.g. What is the joining date listed in this document?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 6,
            fontSize: "14px",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* Quick Questions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {quickQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => {
              setQuestion(q);
              handleAsk(q);
            }}
            style={{
              padding: "5px 10px",
              background: "#e3f2fd",
              border: "1px solid #90caf9",
              color: "#1e88e5",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: "500",
              cursor: "pointer",
              transition: "0.2s",
            }}
            onMouseOver={(e) => (e.target.style.background = "#bbdefb")}
            onMouseOut={(e) => (e.target.style.background = "#e3f2fd")}
          >
            {q}
          </button>
        ))}
      </div>

      <button
        onClick={() => handleAsk()}
        disabled={loading}
        style={{
          width: "100%",
          padding: 12,
          background: loading ? "#aaa" : "#3498db",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 10px rgba(52,152,219,0.15)",
          transition: "0.2s",
        }}
      >
        {loading ? "AI is analyzing document..." : "Ask AI 🤖"}
      </button>

      {error && (
        <div style={{ marginTop: 15, padding: 12, background: "#fde8e8", borderRadius: 6, color: "#e74c3c", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {answer && (
        <div
          style={{
            marginTop: 20,
            padding: "15px 20px",
            background: "#e8fdf0",
            borderRadius: 8,
            border: "1px solid #b2f5ea",
            color: "#2e7d32",
            fontSize: "14px",
          }}
        >
          <strong>🤖 AI Assistant Response:</strong>
          <p style={{ marginTop: 8, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#2c3e50" }}>{answer}</p>
        </div>
      )}
    </div>
  );
}