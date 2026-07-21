import { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

export default function Profile() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [profileUser, setProfileUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [activeTab, setActiveTab] = useState("attendance");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const targetId = id || user?.id;

  useEffect(() => {
    if (targetId) {
      fetchProfileData();
    }
  }, [targetId]);

  const fetchProfileData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Profile info
      const profileRes = await axios.get(`http://localhost:3000/api/employees`);
      const matched = profileRes.data.find(emp => emp.id === parseInt(targetId));
      if (!matched) {
        throw new Error("Employee profile not found");
      }
      setProfileUser(matched);

      // 2. Fetch Attendance
      const attRes = await axios.get(`http://localhost:3000/api/attendance`);
      setAttendance(attRes.data.filter(a => a.employee_id === parseInt(targetId)));

      // 3. Fetch Leaves
      const leaveRes = await axios.get(`http://localhost:3000/api/leaves`);
      setLeaves(leaveRes.data.filter(l => l.employee_id === parseInt(targetId)));

      // 4. Fetch Payslips / Payroll records
      const payRes = await axios.get(`http://localhost:3000/api/payroll`);
      setPayslips(payRes.data.filter(p => p.employee_id === parseInt(targetId)));

    } catch (err) {
      console.error("Error loading profile details:", err);
      setError(err.message || "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPayslip = async (payrollId, month) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/payslip/${payrollId}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `payslip_${profileUser?.name.replace(" ", "_")}_${month}.pdf`;
      link.click();
    } catch (err) {
      alert("Error downloading payslip. Please try again.");
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", fontSize: "18px" }}>Loading employee profile...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ color: "#e74c3c" }}>⚠️ Error</h2>
        <p>{error}</p>
        <Link to="/" style={{ color: "#3498db", fontWeight: "600" }}>Back to Dashboard</Link>
      </div>
    );
  }

  const badgeColor = (role) => {
    switch (role) {
      case "Admin": return "#e74c3c";
      case "HR Manager": return "#2ecc71";
      case "HOD": return "#9b59b6";
      default: return "#3498db";
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ color: "#2c3e50", margin: 0, fontSize: "32px" }}>👤 Employee Profile</h1>
        <Link to="/" style={{
          backgroundColor: "#7f8c8d",
          color: "white",
          padding: "10px 20px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "14px"
        }}>
          🏠 Back
        </Link>
      </div>

      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
        {/* Left Side Card — Profile Info */}
        <div style={{
          flex: "1",
          minWidth: "300px",
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
          maxHeight: "fit-content"
        }}>
          <div style={{ textAlign: "center", marginBottom: "25px" }}>
            <div style={{
              fontSize: "64px",
              background: "#f8f9fa",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 15px",
              border: "3px solid #f1f3f5"
            }}>
              👤
            </div>
            <h2 style={{ color: "#2c3e50", margin: "0 0 5px", fontSize: "22px" }}>{profileUser?.name}</h2>
            <span style={{
              backgroundColor: badgeColor(profileUser?.role),
              color: "white",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700"
            }}>
              {profileUser?.role}
            </span>
          </div>

          <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "20px 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { label: "Employee ID", value: profileUser?.id },
              { label: "Email Address", value: profileUser?.email || "No Email Set" },
              { label: "Department", value: profileUser?.department || "General" },
              { label: "Base Salary", value: `₹${parseFloat(profileUser?.base_salary || 0).toLocaleString()}` },
              { label: "Date Joined", value: profileUser?.created_at ? new Date(profileUser.created_at).toLocaleDateString() : "N/A" }
            ].map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#7f8c8d", fontSize: "14px" }}>{item.label}</span>
                <span style={{ color: "#2c3e50", fontWeight: "600", fontSize: "14px" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Tabs — Logs */}
        <div style={{
          flex: "2",
          minWidth: "350px",
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
        }}>
          {/* Tab Navigation */}
          <div style={{
            display: "flex",
            borderBottom: "2px solid #f1f3f5",
            marginBottom: "25px",
            gap: "20px"
          }}>
            {[
              { id: "attendance", label: "📅 Attendance History" },
              { id: "leaves", label: "✉️ Leave Requests" },
              { id: "payslips", label: "💵 Payslips" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "12px 6px",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: activeTab === tab.id ? "#3498db" : "#95a5a6",
                  borderBottom: activeTab === tab.id ? "3px solid #3498db" : "3px solid transparent",
                  cursor: "pointer",
                  transition: "0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          {activeTab === "attendance" && (
            <div>
              {attendance.length === 0 ? (
                <div style={{ color: "#aaa", textAlign: "center", padding: "40px" }}>No attendance logs found.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee", color: "#7f8c8d", fontSize: "13px" }}>
                      <th style={{ padding: "12px 8px", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "12px 8px", textAlign: "center" }}>Status</th>
                      <th style={{ padding: "12px 8px", textAlign: "center" }}>Clock In</th>
                      <th style={{ padding: "12px 8px", textAlign: "center" }}>Clock Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid #f8f9fa", fontSize: "14px" }}>
                        <td style={{ padding: "12px 8px", color: "#2c3e50" }}>{new Date(log.date).toLocaleDateString()}</td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <span style={{
                            backgroundColor: log.status === "Present" ? "#e8fdf0" : "#fde8e8",
                            color: log.status === "Present" ? "#2ecc71" : "#e74c3c",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600"
                          }}>{log.status}</span>
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center", color: "#2c3e50" }}>{log.clock_in || "--:--"}</td>
                        <td style={{ padding: "12px 8px", textAlign: "center", color: "#2c3e50" }}>{log.clock_out || "--:--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "leaves" && (
            <div>
              {leaves.length === 0 ? (
                <div style={{ color: "#aaa", textAlign: "center", padding: "40px" }}>No leave requests found.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee", color: "#7f8c8d", fontSize: "13px" }}>
                      <th style={{ padding: "12px 8px", textAlign: "left" }}>Type</th>
                      <th style={{ padding: "12px 8px", textAlign: "left" }}>Duration</th>
                      <th style={{ padding: "12px 8px", textAlign: "left" }}>Reason</th>
                      <th style={{ padding: "12px 8px", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.id} style={{ borderBottom: "1px solid #f8f9fa", fontSize: "14px" }}>
                        <td style={{ padding: "12px 8px", fontWeight: "600", color: "#2c3e50" }}>{l.leave_type}</td>
                        <td style={{ padding: "12px 8px", color: "#555" }}>
                          {new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px 8px", color: "#7f8c8d", fontSize: "13px" }}>{l.reason}</td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <span style={{
                            backgroundColor: l.status === "Approved" ? "#e8fdf0" : l.status === "Rejected" ? "#fde8e8" : "#fef3c7",
                            color: l.status === "Approved" ? "#2ecc71" : l.status === "Rejected" ? "#e74c3c" : "#d97706",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600"
                          }}>{l.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "payslips" && (
            <div>
              {payslips.length === 0 ? (
                <div style={{ color: "#aaa", textAlign: "center", padding: "40px" }}>No generated payslips found.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee", color: "#7f8c8d", fontSize: "13px" }}>
                      <th style={{ padding: "12px 8px", textAlign: "left" }}>Month</th>
                      <th style={{ padding: "12px 8px", textAlign: "right" }}>Basic Salary</th>
                      <th style={{ padding: "12px 8px", textAlign: "right" }}>Net Salary</th>
                      <th style={{ padding: "12px 8px", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f8f9fa", fontSize: "14px" }}>
                        <td style={{ padding: "12px 8px", fontWeight: "600", color: "#2c3e50" }}>{p.month}</td>
                        <td style={{ padding: "12px 8px", textAlign: "right", color: "#555" }}>₹{parseFloat(p.basic_salary).toLocaleString()}</td>
                        <td style={{ padding: "12px 8px", textAlign: "right", color: "#27ae60", fontWeight: "700" }}>₹{parseFloat(p.net_salary).toLocaleString()}</td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <button
                            onClick={() => handleDownloadPayslip(p.id, p.month)}
                            style={{
                              backgroundColor: "#3498db",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "0.2s"
                            }}
                          >
                            ⬇️ Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
