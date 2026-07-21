import { useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

function PayrollList({ payrollList, onDelete }) {
  const { user, token } = useContext(AuthContext);

  const deletePayroll = (id) => {
    if (window.confirm("Are you sure you want to delete this payroll record?")) {
      axios.delete(`https://payroll-backend-pakr.onrender.com/api/payroll/${id}`).then(() => onDelete());
    }
  };

  // Download payslip as PDF (authorized)
  const downloadPayslip = async (id, name, month) => {
    try {
      const response = await fetch(`https://payroll-backend-pakr.onrender.com/api/payslip/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip_${name.replace(" ", "_")}_${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error downloading payslip: " + err.message);
    }
  };

  const isManager = user?.role === "Admin" || user?.role === "HR Manager";

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
      <h2
        style={{
          color: "#2c3e50",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        💵 Payroll Records History
      </h2>

      {payrollList.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#aaa",
            fontSize: "16px",
          }}
        >
          No payroll records found.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "linear-gradient(135deg, #2c3e50, #3498db)",
                  color: "white",
                }}
              >
                <th style={{ padding: "14px", textAlign: "center" }}>Employee</th>
                <th style={{ padding: "14px", textAlign: "center" }}>Month</th>
                <th style={{ padding: "14px", textAlign: "right" }}>Basic</th>
                <th style={{ padding: "14px", textAlign: "right" }}>Allowance</th>
                <th style={{ padding: "14px", textAlign: "right" }}>Deduction</th>
                <th style={{ padding: "14px", textAlign: "center" }}>PT</th>
                <th style={{ padding: "14px", textAlign: "center" }}>SS</th>
                <th style={{ padding: "14px", textAlign: "right" }}>Net Salary</th>
                <th style={{ padding: "14px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrollList.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <td style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: "#2c3e50" }}>
                    👤 {p.name}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <span
                      style={{
                        backgroundColor: "#f0e6ff",
                        color: "#9b59b6",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      {p.month}
                    </span>
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    ₹{parseFloat(p.basic_salary).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", color: "#2ecc71", fontWeight: "bold" }}>
                    +₹{parseFloat(p.allowance).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", color: "#e74c3c", fontWeight: "bold" }}>
                    -₹{parseFloat(p.deduction).toLocaleString()}
                  </td>

                  {/* PT column */}
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <span
                      style={{
                        background: "#fef9e7",
                        color: "#f39c12",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      ₹{p.pt || 0}
                    </span>
                  </td>

                  {/* SS column */}
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <span
                      style={{
                        background: "#f4ecff",
                        color: "#9b59b6",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      ₹{p.ss || 0}
                    </span>
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      color: "#2c3e50",
                      fontWeight: "bold",
                      fontSize: "16px",
                    }}
                  >
                    ₹{parseFloat(p.net_salary).toLocaleString()}
                  </td>

                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        onClick={() => downloadPayslip(p.id, p.name, p.month)}
                        style={{
                          backgroundColor: "#3498db",
                          color: "white",
                          padding: "7px 14px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "12px",
                        }}
                      >
                        📄 Payslip PDF
                      </button>
                      {isManager && (
                        <button
                          onClick={() => deletePayroll(p.id)}
                          style={{
                            backgroundColor: "#e74c3c",
                            color: "white",
                            padding: "7px 14px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "12px",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PayrollList;