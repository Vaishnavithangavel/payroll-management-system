import { useState, useEffect } from "react";
import axios from "axios";

function AddEmployee({ onEmployeeAdded }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Employee");
  const [departmentId, setDepartmentId] = useState("");
  const [salary, setSalary] = useState("");
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await axios.get("https://payroll-backend-pakr.onrender.com/api/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const addEmployee = () => {
    if (!name || !email || !password || !salary) {
      alert("Please fill in Name, Email, Password, and Salary!");
      return;
    }
    axios
      .post("https://payroll-backend-pakr.onrender.com/api/employees", {
        name,
        email,
        password,
        role,
        department_id: departmentId || null,
        base_salary: salary,
      })
      .then(() => {
        onEmployeeAdded();
        setName("");
        setEmail("");
        setPassword("");
        setRole("Employee");
        setDepartmentId("");
        setSalary("");
      })
      .catch((err) => {
        alert(err.response?.data?.error || "Failed to add employee.");
      });
  };

  const inputStyle = {
    padding: "12px 16px",
    border: "2px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        background: "white",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        marginBottom: "30px",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <h2 style={{ color: "#2c3e50", marginBottom: "20px", textAlign: "center" }}>
        ➕ Register New Employee
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "15px",
          marginBottom: "20px"
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>FULL NAME</label>
          <input
            placeholder="👤 Employee Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>EMAIL ADDRESS</label>
          <input
            type="email"
            placeholder="📧 email@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>PASSWORD</label>
          <input
            type="password"
            placeholder="🔒 Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>SYSTEM ROLE</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
            <option value="Employee">Employee</option>
            <option value="HOD">Head of Department (HOD)</option>
            <option value="HR Manager">HR Manager</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>DEPARTMENT</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            style={inputStyle}
          >
            <option value="">🏢 Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>BASE MONTHLY SALARY</label>
          <input
            placeholder="💰 Base Salary"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            type="number"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <button
          onClick={addEmployee}
          style={{
            backgroundColor: "#3498db",
            color: "white",
            padding: "13px 40px",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(52,152,219,0.2)"
          }}
        >
          + Add Employee
        </button>
      </div>
    </div>
  );
}

export default AddEmployee;