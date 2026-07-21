import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AddEmployee from "../components/AddEmployee";
import EmployeeList from "../components/EmployeeList";
import PageNavigation from "../components/PageNavigation";
import { AuthContext } from "../context/AuthContext";

export default function Employees() {
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState("directory");

  // Add department form state
  const [newDeptName, setNewDeptName] = useState("");

  // Assign HOD state maps departmentId -> employeeId
  const [selectedHods, setSelectedHods] = useState({});

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = () => {
    axios.get("https://payroll-backend-pakr.onrender.com/api/employees").then((res) => {
      setEmployees(res.data);
    });
  };

  const fetchDepartments = () => {
    axios.get("https://payroll-backend-pakr.onrender.com/api/departments").then((res) => {
      setDepartments(res.data);
      // Initialize selected HOD mapping
      const hodMap = {};
      res.data.forEach((d) => {
        hodMap[d.id] = d.hod_id || "";
      });
      setSelectedHods(hodMap);
    });
  };

  const handleAddDept = (e) => {
    e.preventDefault();
    if (!newDeptName) return;
    axios
      .post("https://payroll-backend-pakr.onrender.com/api/departments", { name: newDeptName })
      .then(() => {
        setNewDeptName("");
        fetchDepartments();
        alert("Department created successfully!");
      })
      .catch((err) => {
        alert(err.response?.data?.error || "Error creating department.");
      });
  };

  const handleAssignHod = (deptId) => {
    const hodId = selectedHods[deptId];
    const dept = departments.find((d) => d.id === deptId);

    axios
      .put(`https://payroll-backend-pakr.onrender.com/api/departments/${deptId}`, {
        name: dept.name,
        hod_id: hodId || null,
      })
      .then(() => {
        alert("HOD assigned successfully!");
        fetchDepartments();
        fetchEmployees(); // roles might have updated
      })
      .catch((err) => {
        alert(err.response?.data?.error || "Failed to assign HOD.");
      });
  };

  const handleDeleteDept = (deptId) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      axios
        .delete(`https://payroll-backend-pakr.onrender.com/api/departments/${deptId}`)
        .then(() => {
          fetchDepartments();
          fetchEmployees();
          alert("Department deleted.");
        })
        .catch((err) => {
          alert(err.response?.data?.error || "Error deleting department.");
        });
    }
  };

  const isManager = user?.role === "Admin" || user?.role === "HR Manager";

  return (
    <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <h1
        style={{
          color: "#2c3e50",
          marginBottom: "30px",
          textAlign: "center",
          fontSize: "36px",
          fontWeight: "700",
        }}
      >
        👨‍💼 Employee & Department Management
      </h1>

      {/* Tabs */}
      {isManager && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginBottom: "30px",
          }}
        >
          <button
            onClick={() => setActiveTab("directory")}
            style={{
              padding: "10px 25px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              backgroundColor: activeTab === "directory" ? "#2c3e50" : "#e2e8f0",
              color: activeTab === "directory" ? "white" : "#475569",
              transition: "0.2s",
            }}
          >
            Staff Directory
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            style={{
              padding: "10px 25px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              backgroundColor: activeTab === "departments" ? "#2c3e50" : "#e2e8f0",
              color: activeTab === "departments" ? "white" : "#475569",
              transition: "0.2s",
            }}
          >
            Department Management
          </button>
        </div>
      )}

      {/* Staff Directory View */}
      {activeTab === "directory" && (
        <div>
          {isManager && <AddEmployee onEmployeeAdded={fetchEmployees} />}
          <EmployeeList employees={employees} onDelete={fetchEmployees} onUpdate={fetchEmployees} />
        </div>
      )}

      {/* Department Management View */}
      {activeTab === "departments" && isManager && (
        <div>
          {/* Add Department Form */}
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              marginBottom: "30px",
            }}
          >
            <h2 style={{ color: "#2c3e50", marginBottom: "20px", textAlign: "center" }}>
              🏢 Create New Department
            </h2>
            <form onSubmit={handleAddDept} style={{ display: "flex", gap: "15px" }}>
              <input
                placeholder="Department Name (e.g. Research & Development)"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                style={{
                  padding: "12px 16px",
                  border: "2px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  flex: "1",
                  outline: "none",
                }}
                required
              />
              <button
                type="submit"
                style={{
                  backgroundColor: "#2ecc71",
                  color: "white",
                  padding: "12px 30px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                + Create
              </button>
            </form>
          </div>

          {/* Department List */}
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ color: "#2c3e50", marginBottom: "20px", textAlign: "center" }}>
              🏢 Department List & HOD Assignments
            </h2>

            {departments.length === 0 ? (
              <div style={{ color: "#aaa", textAlign: "center", padding: "20px" }}>
                No departments available. Create one above!
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
                    <th style={{ padding: "14px", textAlign: "left" }}>Department Name</th>
                    <th style={{ padding: "14px", textAlign: "left" }}>Assigned HOD</th>
                    <th style={{ padding: "14px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "14px", textAlign: "center", fontWeight: "600" }}>{dept.id}</td>
                      <td style={{ padding: "14px", fontWeight: "600", color: "#2c3e50" }}>{dept.name}</td>
                      <td style={{ padding: "14px" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <select
                            value={selectedHods[dept.id] || ""}
                            onChange={(e) =>
                              setSelectedHods({ ...selectedHods, [dept.id]: e.target.value })
                            }
                            style={{
                              padding: "8px 12px",
                              border: "2px solid #ddd",
                              borderRadius: "6px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          >
                            <option value="">-- No HOD Assigned --</option>
                            {employees
                              .filter((emp) => emp.role === "HOD" || emp.role === "Employee")
                              .map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name} ({emp.department || "No Dept"})
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => handleAssignHod(dept.id)}
                            style={{
                              backgroundColor: "#3498db",
                              color: "white",
                              border: "none",
                              padding: "8px 14px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Save HOD
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "14px", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteDept(dept.id)}
                          style={{
                            backgroundColor: "#e74c3c",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <PageNavigation
        previous={{
          path: "/",
          label: "Home",
        }}
        next={{
          path: "/payroll",
          label: "Payroll",
        }}
      />
    </div>
  );
}