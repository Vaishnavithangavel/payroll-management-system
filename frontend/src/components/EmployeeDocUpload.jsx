import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

export default function EmployeeDocUpload() {
  const { user, token } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [empId, setEmpId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllowedEmployees();
  }, []);

  const fetchAllowedEmployees = async () => {
    try {
      const res = await axios.get("https://payroll-backend-pakr.onrender.com/api/employees");
      setEmployees(res.data);
      if (res.data.length > 0) {
        // Auto-select the first employee (for employees, it will be themselves)
        setEmpId(res.data[0].id.toString());
      }
    } catch (err) {
      console.error("Error fetching allowed employees:", err);
    }
  };

  const handleUpload = async () => {
    if (!empId) return setStatus("❌ Please select an employee");
    if (!file) return setStatus("❌ Please select a PDF file");

    setLoading(true);
    setStatus("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("emp_id", empId);

    try {
      const res = await fetch("/api/upload-doc", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(`✅ ${data.message}`);
        setFile(null);
      } else {
        setStatus(`❌ ${data.message || "Upload failed."}`);
      }
    } catch (err) {
      setStatus("❌ Upload failed. Check backend connection.");
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
      <h3 style={{ color: "#2c3e50", margin: "0 0 15px", fontSize: "18px" }}>📄 Upload Employee Document</h3>

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
          Uploading document for: <b>{user.name}</b>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "600", fontSize: "13px", color: "#555" }}>
          Select PDF Document
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ fontSize: "13px" }}
        />
        {file && <p style={{ fontSize: 13, color: "#27ae60", marginTop: "6px" }}>📎 {file.name} ({Math.round(file.size / 1024)} KB)</p>}
      </div>

      <button
        onClick={handleUpload}
        disabled={loading}
        style={{
          width: "100%",
          padding: 12,
          background: loading ? "#aaa" : "#2ecc71",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 10px rgba(46,204,113,0.15)",
          transition: "0.2s",
        }}
      >
        {loading ? "Uploading & Sectioning..." : "Upload Document"}
      </button>

      {status && (
        <div
          style={{
            marginTop: 15,
            padding: 12,
            background: "#f8f9fa",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            fontSize: "13px",
            lineHeight: "1.4",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}