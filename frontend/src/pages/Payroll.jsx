import { useState, useEffect, useContext } from "react";
import axios from "axios";
import PayrollList from "../components/PayrollList";
import PageNavigation from "../components/PageNavigation";
import { AuthContext } from "../context/AuthContext";

function Payroll() {
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState("");
  const [allowance, setAllowance] = useState("");
  const [deduction, setDeduction] = useState("");
  const [payrollList, setPayrollList] = useState([]);
  const [taxResult, setTaxResult] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchPayroll();
  }, []);

  const fetchEmployees = () => {
    // If Admin/HR, fetches all; if HOD, fetches department employees automatically
    axios.get("https://payroll-backend-pakr.onrender.com/api/employees").then((res) => setEmployees(res.data));
  };

  const fetchPayroll = () => {
    axios.get("https://payroll-backend-pakr.onrender.com/api/payroll").then((res) => setPayrollList(res.data));
  };

  const calculatePayroll = () => {
    if (!selectedEmployee || !month || !allowance || !deduction) {
      alert("Please fill all fields!");
      return;
    }
    axios
      .post("https://payroll-backend-pakr.onrender.com/api/payroll", {
        employee_id: selectedEmployee,
        month,
        allowance,
        deduction,
      })
      .then((res) => {
        setTaxResult(res.data);
        fetchPayroll();
        setSelectedEmployee("");
        setMonth("");
        setAllowance("");
        setDeduction("");
      })
      .catch((err) => {
        alert(err.response?.data?.error || "Error generating payroll.");
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

  const isManager = user?.role === "Admin" || user?.role === "HR Manager";

  return (
    <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <h1
        style={{
          color: "#2c3e50",
          marginBottom: "30px",
          textAlign: "center",
          fontSize: "36px",
          fontWeight: "700"
        }}
      >
        💵 Payroll Management
      </h1>

      {/* Calculate Salary Form (Admin/HR only) */}
      {isManager && (
        <div
          style={{
            background: "white",
            padding: "30px",
            borderRadius: "16px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ color: "#2c3e50", marginBottom: "20px", textAlign: "center" }}>
            🧮 Calculate Salary
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={inputStyle}
            >
              <option value="">👤 Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department || "No Dept"})
                </option>
              ))}
            </select>

            <input
              placeholder="📅 Month (e.g. June 2026)"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="➕ Allowance"
              value={allowance}
              onChange={(e) => setAllowance(e.target.value)}
              type="number"
              style={inputStyle}
            />
            <input
              placeholder="➖ Other Deduction"
              value={deduction}
              onChange={(e) => setDeduction(e.target.value)}
              type="number"
              style={inputStyle}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <button
              onClick={calculatePayroll}
              style={{
                backgroundColor: "#2ecc71",
                color: "white",
                padding: "13px 40px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(46,204,113,0.2)"
              }}
            >
              🧮 Calculate & Save
            </button>
          </div>
        </div>
      )}

      {/* Tax Breakdown Result Card */}
      {taxResult && (
        <div
          style={{
            background: "white",
            padding: "24px 30px",
            borderRadius: "16px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            marginBottom: "24px",
            borderLeft: "5px solid #3498db",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ color: "#2c3e50", margin: 0 }}>🧾 Tax Computation Breakdown</h3>
            <button
              onClick={() => setTaxResult(null)}
              style={{
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#aaa",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            {[
              { label: "Net Salary", value: `₹${parseFloat(taxResult.net_salary).toLocaleString()}`, color: "#27ae60" },
              { label: "Prof. Tax (PT)", value: `₹${taxResult.pt}`, color: "#f39c12" },
              { label: "Social Security (SS)", value: `₹${taxResult.ss}`, color: "#9b59b6" },
              { label: "Total Tax", value: `₹${taxResult.total_tax}`, color: "#e74c3c" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: color + "12",
                  borderLeft: `4px solid ${color}`,
                  padding: "14px 16px",
                  borderRadius: "8px",
                  flex: "1",
                  minWidth: "150px"
                }}
              >
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PayrollList payrollList={payrollList} onDelete={fetchPayroll} />

      <PageNavigation
        previous={{
          path: "/employees",
          label: "Employees",
        }}
        next={{
          path: "/reports",
          label: "Reports",
        }}
      />
    </div>
  );
}

export default Payroll;