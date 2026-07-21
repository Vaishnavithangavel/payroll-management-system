import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

function EmployeeList({ employees, onDelete, onUpdate }) {
  const { user } = useContext(AuthContext);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editSalary, setEditSalary] = useState("");
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

  const deleteEmployee = (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      axios.delete(`https://payroll-backend-pakr.onrender.com/api/employees/${id}`).then(() => onDelete());
    }
  };

  const startEdit = (emp) => {
    setEditId(emp.id);
    setEditName(emp.name);
    setEditEmail(emp.email || "");
    setEditRole(emp.role);
    setEditDepartmentId(emp.department_id || "");
    setEditSalary(emp.base_salary);
    setEditPassword("");
  };

  const saveEdit = () => {
    axios
      .put(`https://payroll-backend-pakr.onrender.com/api/employees/${editId}`, {
        name: editName,
        email: editEmail,
        password: editPassword || undefined, // only update password if typed
        role: editRole,
        department_id: editDepartmentId || null,
        base_salary: editSalary,
      })
      .then(() => {
        setEditId(null);
        onUpdate();
      })
      .catch((err) => {
        alert(err.response?.data?.error || "Error updating employee details.");
      });
  };

  const inputStyle = {
    padding: "8px 12px",
    border: "2px solid #3498db",
    borderRadius: "6px",
    fontSize: "13px",
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

  const isManager = user?.role === "Admin" || user?.role === "HR Manager";

  return (
    <div
      style={{
        background: "white",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <h2 style={{ color: "#2c3e50", marginBottom: "20px", textAlign: "center" }}>
        👨‍💼 Employee Staff Directory
      </h2>

      {employees.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#aaa",
            fontSize: "16px",
          }}
        >
          No employees found.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "linear-gradient(135deg, #2c3e50, #3498db)",
                color: "white",
              }}
            >
              <th style={{ padding: "14px", textAlign: "center" }}>ID</th>
              <th style={{ padding: "14px", textAlign: "left" }}>Name & Email</th>
              <th style={{ padding: "14px", textAlign: "center" }}>Role</th>
              <th style={{ padding: "14px", textAlign: "center" }}>Department</th>
              <th style={{ padding: "14px", textAlign: "right" }}>Base Salary</th>
              <th style={{ padding: "14px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr
                key={emp.id}
                style={{
                  borderBottom: "1px solid #eee",
                  backgroundColor: editId === emp.id ? "#f0f7ff" : "white",
                }}
              >
                <td style={{ padding: "14px", textAlign: "center", fontWeight: "600", color: "#2c3e50" }}>
                  {emp.id}
                </td>

                <td style={{ padding: "14px", textAlign: "left" }}>
                  {editId === emp.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                        style={inputStyle}
                      />
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Email"
                        style={inputStyle}
                      />
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="New Password (Optional)"
                        style={inputStyle}
                      />
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: "600", color: "#2c3e50" }}>
                        <Link to={`/profile/${emp.id}`} style={{ textDecoration: "none", color: "#2c3e50" }}>
                          👤 {emp.name}
                        </Link>
                      </div>
                      <div style={{ fontSize: "12px", color: "#7f8c8d" }}>{emp.email}</div>
                    </div>
                  )}
                </td>

                <td style={{ padding: "14px", textAlign: "center" }}>
                  {editId === emp.id ? (
                    <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={inputStyle}>
                      <option value="Employee">Employee</option>
                      <option value="HOD">HOD</option>
                      <option value="HR Manager">HR Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  ) : (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor:
                          emp.role === "Admin"
                            ? "#fee2e2"
                            : emp.role === "HR Manager"
                            ? "#dcfce7"
                            : emp.role === "HOD"
                            ? "#f3e8ff"
                            : "#e0f2fe",
                        color:
                          emp.role === "Admin"
                            ? "#991b1b"
                            : emp.role === "HR Manager"
                            ? "#166534"
                            : emp.role === "HOD"
                            ? "#6b21a8"
                            : "#0369a1",
                      }}
                    >
                      {emp.role}
                    </span>
                  )}
                </td>

                <td style={{ padding: "14px", textAlign: "center" }}>
                  {editId === emp.id ? (
                    <select
                      value={editDepartmentId}
                      onChange={(e) => setEditDepartmentId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">None</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      style={{
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      {emp.department || "Unassigned"}
                    </span>
                  )}
                </td>

                <td style={{ padding: "14px", textAlign: "right" }}>
                  {editId === emp.id ? (
                    <input
                      value={editSalary}
                      onChange={(e) => setEditSalary(e.target.value)}
                      type="number"
                      style={inputStyle}
                    />
                  ) : (
                    <span style={{ color: "#27ae60", fontWeight: "bold" }}>
                      ₹{parseFloat(emp.base_salary || 0).toLocaleString()}
                    </span>
                  )}
                </td>

                <td style={{ padding: "14px", textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    {editId === emp.id ? (
                      <>
                        <button
                          onClick={saveEdit}
                          style={{
                            backgroundColor: "#2ecc71",
                            color: "white",
                            padding: "7px 16px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: "600",
                          }}
                        >
                          ✅ Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          style={{
                            backgroundColor: "#95a5a6",
                            color: "white",
                            padding: "7px 16px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: "600",
                          }}
                        >
                          ❌ Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/profile/${emp.id}`}
                          style={{
                            backgroundColor: "#3498db",
                            color: "white",
                            padding: "7px 14px",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontWeight: "600",
                            fontSize: "13px",
                            display: "inline-block"
                          }}
                        >
                          👁️ View
                        </Link>
                        {isManager && (
                          <>
                            <button
                              onClick={() => startEdit(emp)}
                              style={{
                                backgroundColor: "#f39c12",
                                color: "white",
                                padding: "7px 14px",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "13px"
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteEmployee(emp.id)}
                              style={{
                                backgroundColor: "#e74c3c",
                                color: "white",
                                padding: "7px 14px",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "13px"
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EmployeeList;