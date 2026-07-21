import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import PageNavigation from "../components/PageNavigation";

export default function Home() {
  const { user } = useContext(AuthContext);
  
  // States
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [totalDepartments, setTotalDepartments] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  
  // Employee Attendance States
  const [checkedIn, setCheckedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [alreadyClockedOut, setAlreadyClockedOut] = useState(false);

  // Leave Form States
  const [leaveType, setLeaveType] = useState("Sick Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [myLeaves, setMyLeaves] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // 1. Notifications (All roles)
      const notifRes = await axios.get("http://localhost:3000/api/notifications");
      setNotifications(notifRes.data);

      // 2. Role specific fetches
      if (user.role === "Admin" || user.role === "HR Manager") {
        const empRes = await axios.get("http://localhost:3000/api/employees");
        setTotalEmployees(empRes.data.length);
        const depts = [...new Set(empRes.data.map(e => e.department).filter(Boolean))];
        setTotalDepartments(depts.length || 6);

        const payRes = await axios.get("http://localhost:3000/api/payroll");
        const total = payRes.data.reduce((sum, p) => sum + parseFloat(p.net_salary), 0);
        setTotalPayroll(total);

        // Fetch leaves for review
        const leavesRes = await axios.get("http://localhost:3000/api/leaves");
        setPendingLeaves(leavesRes.data.filter(l => l.status === "Pending"));

      } else if (user.role === "HOD") {
        const empRes = await axios.get("http://localhost:3000/api/employees");
        // HOD is automatically filtered by department in the backend route
        setTotalEmployees(empRes.data.length);

        const leavesRes = await axios.get("http://localhost:3000/api/leaves");
        setPendingLeaves(leavesRes.data.filter(l => l.status === "Pending"));

      } else if (user.role === "Employee") {
        // Fetch employee leaves
        const leavesRes = await axios.get("http://localhost:3000/api/leaves");
        setMyLeaves(leavesRes.data);

        // Fetch today's clock status
        const attRes = await axios.get("http://localhost:3000/api/attendance/today");
        if (attRes.data.checkedIn) {
          setCheckedIn(true);
          setClockInTime(attRes.data.record.clock_in);
          if (attRes.data.record.clock_out) {
            setClockOutTime(attRes.data.record.clock_out);
            setAlreadyClockedOut(true);
          }
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  // Clock action (In / Out)
  const handleClockAction = async () => {
    try {
      const res = await axios.post("http://localhost:3000/api/attendance/clock");
      if (res.data.checkedIn) {
        setCheckedIn(true);
        setClockInTime(res.data.clock_in);
      } else if (res.data.checkedOut) {
        setClockOutTime(res.data.clock_out);
        setAlreadyClockedOut(true);
      }
      // Re-fetch notifications and dashboard data
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Clocking failed.");
    }
  };

  // Leave application
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      alert("Please fill in all leave application fields.");
      return;
    }
    try {
      await axios.post("http://localhost:3000/api/leaves", {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason
      });
      alert("Leave applied successfully!");
      setStartDate("");
      setEndDate("");
      setReason("");
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to apply for leave.");
    }
  };

  // Leave approval
  const handleLeaveDecision = async (leaveId, decision) => {
    try {
      await axios.put(`http://localhost:3000/api/leaves/${leaveId}`, { status: decision });
      alert(`Leave request ${decision.toLowerCase()}!`);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Error updating leave request.");
    }
  };

  // Clear notifications
  const handleMarkAllRead = async () => {
    try {
      await axios.put("http://localhost:3000/api/notifications/read-all");
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  const dashboardContainerStyle = {
    padding: "40px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "'Inter', sans-serif"
  };

  const headerStyle = {
    color: "#2c3e50",
    fontSize: "32px",
    marginBottom: "5px",
    fontWeight: "700"
  };

  const subHeaderStyle = {
    color: "#7f8c8d",
    marginBottom: "40px",
    fontSize: "16px"
  };

  const cardContainerStyle = {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    marginBottom: "40px"
  };

  const cardStyle = (color1, color2, shadowColor) => ({
    background: `linear-gradient(135deg, ${color1}, ${color2})`,
    color: "white",
    padding: "30px",
    borderRadius: "16px",
    flex: "1",
    minWidth: "240px",
    boxShadow: `0 8px 20px ${shadowColor}`,
    position: "relative",
    overflow: "hidden"
  });

  return (
    <div style={dashboardContainerStyle}>
      <h1 style={headerStyle}>💰 Welcome, {user.name}!</h1>
      <p style={subHeaderStyle}>Role: <b>{user.role}</b> {user.department ? `| Department: ${user.department}` : ""}</p>

      {/* ADMIN & HR DASHBOARD VIEW */}
      {(user.role === "Admin" || user.role === "HR Manager") && (
        <>
          <div style={cardContainerStyle}>
            <div style={cardStyle("#3498db", "#2980b9", "rgba(52,152,219,0.3)")}>
              <div style={{ fontSize: "40px" }}>👨‍💼</div>
              <div style={{ fontSize: "36px", fontWeight: "bold", margin: "10px 0" }}>{totalEmployees}</div>
              <div style={{ fontSize: "16px", opacity: 0.9 }}>Total Employees</div>
            </div>

            <div style={cardStyle("#2ecc71", "#27ae60", "rgba(46,204,113,0.3)")}>
              <div style={{ fontSize: "40px" }}>💵</div>
              <div style={{ fontSize: "36px", fontWeight: "bold", margin: "10px 0" }}>₹{totalPayroll.toLocaleString()}</div>
              <div style={{ fontSize: "16px", opacity: 0.9 }}>Total Monthly Payroll</div>
            </div>

            <div style={cardStyle("#9b59b6", "#8e44ad", "rgba(155,89,182,0.3)")}>
              <div style={{ fontSize: "40px" }}>🏢</div>
              <div style={{ fontSize: "36px", fontWeight: "bold", margin: "10px 0" }}>{totalDepartments}</div>
              <div style={{ fontSize: "16px", opacity: 0.9 }}>Departments</div>
            </div>

            <a href="/interview-ai" style={{ ...cardStyle("#e67e22", "#d35400", "rgba(230,126,34,0.3)"), textDecoration: "none" }}>
              <div style={{ fontSize: "40px" }}>🤖</div>
              <div style={{ fontSize: "36px", fontWeight: "bold", margin: "10px 0" }}>AI</div>
              <div style={{ fontSize: "16px", opacity: 0.9 }}>HR Interview AI</div>
            </a>
          </div>

          <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", marginBottom: "40px" }}>
            {/* Pending Leaves review */}
            <div style={{
              flex: "2",
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              minWidth: "350px"
            }}>
              <h2 style={{ color: "#2c3e50", marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
                <span>✉️ Pending Leave Requests</span>
                <span style={{ fontSize: "14px", backgroundColor: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "12px" }}>
                  {pendingLeaves.length} action item(s)
                </span>
              </h2>

              {pendingLeaves.length === 0 ? (
                <div style={{ padding: "40px", color: "#aaa", textAlign: "center" }}>No pending leave applications. Awesome! 🙌</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {pendingLeaves.map(leave => (
                    <div key={leave.id} style={{
                      border: "1px solid #f1f3f5",
                      padding: "20px",
                      borderRadius: "12px",
                      backgroundColor: "#fafafa",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "16px", color: "#2c3e50" }}>{leave.employee_name}</div>
                        <div style={{ fontSize: "13px", color: "#7f8c8d", margin: "4px 0" }}>
                          <b>Department:</b> {leave.department_name || "General"} | <b>Type:</b> {leave.leave_type}
                        </div>
                        <div style={{ fontSize: "14px", color: "#555" }}>
                          <b>Dates:</b> {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: "13px", color: "#7f8c8d", marginTop: "8px", fontStyle: "italic" }}>
                          " {leave.reason} "
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleLeaveDecision(leave.id, "Approved")}
                          style={{
                            backgroundColor: "#2ecc71", color: "white", border: "none",
                            padding: "8px 16px", borderRadius: "8px", fontWeight: "600",
                            cursor: "pointer", fontSize: "13px"
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(leave.id, "Rejected")}
                          style={{
                            backgroundColor: "#e74c3c", color: "white", border: "none",
                            padding: "8px 16px", borderRadius: "8px", fontWeight: "600",
                            cursor: "pointer", fontSize: "13px"
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions / System Guide */}
            <div style={{
              flex: "1",
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              minWidth: "250px"
            }}>
              <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>🚀 System Overview</h2>
              <p style={{ color: "#7f8c8d", fontSize: "14px", lineHeight: "1.6" }}>
                As an <b>{user.role}</b>, you have permission to manage all aspects of the company payroll, departments, leaves review, and employee accounts.
              </p>
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <a href="/employees" style={{
                  display: "block", textAlign: "center", backgroundColor: "#3498db", color: "white",
                  padding: "10px", borderRadius: "8px", textDecoration: "none", fontWeight: "600"
                }}>
                  Manage Employees
                </a>
                <a href="/payroll" style={{
                  display: "block", textAlign: "center", backgroundColor: "#2ecc71", color: "white",
                  padding: "10px", borderRadius: "8px", textDecoration: "none", fontWeight: "600"
                }}>
                  Process Payroll
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* HOD DASHBOARD VIEW */}
      {user.role === "HOD" && (
        <>
          <div style={cardContainerStyle}>
            <div style={cardStyle("#9b59b6", "#8e44ad", "rgba(155,89,182,0.3)")}>
              <div style={{ fontSize: "40px" }}>🏢</div>
              <div style={{ fontSize: "36px", fontWeight: "bold", margin: "10px 0" }}>{totalEmployees}</div>
              <div style={{ fontSize: "16px", opacity: 0.9 }}>Department Employees</div>
            </div>

            <div style={cardStyle("#f39c12", "#d35400", "rgba(243,156,18,0.3)")}>
              <div style={{ fontSize: "40px" }}>✉️</div>
              <div style={{ fontSize: "36px", fontWeight: "bold", margin: "10px 0" }}>{pendingLeaves.length}</div>
              <div style={{ fontSize: "16px", opacity: 0.9 }}>Pending Leaves to Approve</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", marginBottom: "40px" }}>
            {/* Department Pending Leaves */}
            <div style={{
              flex: "2",
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              minWidth: "350px"
            }}>
              <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>✉️ Department Leave Review</h2>

              {pendingLeaves.length === 0 ? (
                <div style={{ padding: "40px", color: "#aaa", textAlign: "center" }}>No pending leaves in your department.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {pendingLeaves.map(leave => (
                    <div key={leave.id} style={{
                      border: "1px solid #f1f3f5",
                      padding: "20px",
                      borderRadius: "12px",
                      backgroundColor: "#fafafa",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "16px", color: "#2c3e50" }}>{leave.employee_name}</div>
                        <div style={{ fontSize: "13px", color: "#7f8c8d", margin: "4px 0" }}>
                          <b>Type:</b> {leave.leave_type}
                        </div>
                        <div style={{ fontSize: "14px", color: "#555" }}>
                          <b>Dates:</b> {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: "13px", color: "#7f8c8d", marginTop: "8px", fontStyle: "italic" }}>
                          "{leave.reason}"
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleLeaveDecision(leave.id, "Approved")}
                          style={{
                            backgroundColor: "#2ecc71", color: "white", border: "none",
                            padding: "8px 16px", borderRadius: "8px", fontWeight: "600",
                            cursor: "pointer", fontSize: "13px"
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(leave.id, "Rejected")}
                          style={{
                            backgroundColor: "#e74c3c", color: "white", border: "none",
                            padding: "8px 16px", borderRadius: "8px", fontWeight: "600",
                            cursor: "pointer", fontSize: "13px"
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Department Info */}
            <div style={{
              flex: "1",
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              minWidth: "250px"
            }}>
              <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>🏢 HOD Panel</h2>
              <p style={{ color: "#7f8c8d", fontSize: "14px", lineHeight: "1.6" }}>
                You are managing the <b>{user.department}</b> department. You can approve or reject leaves for your staff, check their attendance logs, and upload department docs.
              </p>
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <a href="/employees" style={{
                  display: "block", textAlign: "center", backgroundColor: "#3498db", color: "white",
                  padding: "10px", borderRadius: "8px", textDecoration: "none", fontWeight: "600"
                }}>
                  View Staff Directory
                </a>
                <a href="/interview-ai" style={{
                  display: "block", textAlign: "center", backgroundColor: "#e67e22", color: "white",
                  padding: "10px", borderRadius: "8px", textDecoration: "none", fontWeight: "600"
                }}>
                  🤖 HR Interview AI
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* EMPLOYEE DASHBOARD VIEW */}
      {user.role === "Employee" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px", flexWrap: "wrap" }}>
          {/* Main Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            
            {/* Clock-In Widget */}
            <div style={{
              background: "linear-gradient(135deg, #2c3e50, #3498db)",
              color: "white",
              padding: "35px",
              borderRadius: "16px",
              boxShadow: "0 6px 20px rgba(52,152,219,0.25)"
            }}>
              <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>⏰ Daily Attendance Punch</h2>
              <p style={{ margin: "0 0 25px", opacity: "0.85" }}>Log your entry and exit times for today.</p>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                <div style={{ display: "flex", gap: "30px" }}>
                  <div>
                    <div style={{ fontSize: "12px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>Clock-In Time</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", marginTop: "4px" }}>{clockInTime || "--:--"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>Clock-Out Time</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", marginTop: "4px" }}>{clockOutTime || "--:--"}</div>
                  </div>
                </div>

                <div>
                  {alreadyClockedOut ? (
                    <span style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: "12px 24px", borderRadius: "8px", fontWeight: "600" }}>
                      ✅ Clocked Out
                    </span>
                  ) : (
                    <button
                      onClick={handleClockAction}
                      style={{
                        backgroundColor: checkedIn ? "#e74c3c" : "#2ecc71",
                        color: "white",
                        padding: "14px 28px",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "15px",
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                        transition: "0.2s"
                      }}
                    >
                      {checkedIn ? "Clock Out ⏰" : "Clock In ⏰"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Apply Leave Form */}
            <div style={{
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
            }}>
              <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>✉️ Request Leave</h2>
              
              <form onSubmit={handleApplyLeave} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                    LEAVE TYPE
                  </label>
                  <select
                    value={leaveType}
                    onChange={e => setLeaveType(e.target.value)}
                    style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", outline: "none" }}
                  >
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Paid Leave">Paid Leave</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                    START DATE
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", outline: "none" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                    END DATE
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", outline: "none" }}
                    required
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                    REASON
                  </label>
                  <textarea
                    placeholder="Provide details about your leave request..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    style={{ width: "100%", padding: "12px", border: "2px solid #eee", borderRadius: "8px", outline: "none", height: "100px", resize: "none" }}
                    required
                  />
                </div>

                <div style={{ gridColumn: "span 2", textAlign: "right" }}>
                  <button type="submit" style={{
                    backgroundColor: "#3498db", color: "white", padding: "12px 30px", border: "none", borderRadius: "8px",
                    fontWeight: "600", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 10px rgba(52,152,219,0.25)"
                  }}>
                    Submit Request
                  </button>
                </div>
              </form>
            </div>

            {/* My Leaves Tracker */}
            <div style={{
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
            }}>
              <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>✉️ Leave Status Tracker</h2>
              {myLeaves.length === 0 ? (
                <div style={{ color: "#aaa", padding: "20px 0", textAlign: "center" }}>You haven't requested any leaves yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee", color: "#7f8c8d", fontSize: "13px" }}>
                      <th style={{ padding: "12px 8px", textAlign: "left" }}>Type</th>
                      <th style={{ padding: "12px 8px", textAlign: "left" }}>Duration</th>
                      <th style={{ padding: "12px 8px", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map(l => (
                      <tr key={l.id} style={{ borderBottom: "1px solid #f8f9fa", fontSize: "14px" }}>
                        <td style={{ padding: "12px 8px", fontWeight: "600", color: "#2c3e50" }}>{l.leave_type}</td>
                        <td style={{ padding: "12px 8px", color: "#555" }}>
                          {new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()}
                        </td>
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
          </div>

          {/* Right Column - Notifications */}
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            <a href="/interview-ai" style={{
              background: "linear-gradient(135deg, #e67e22, #d35400)",
              color: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 6px 18px rgba(230,126,34,0.25)",
              textDecoration: "none",
              display: "block",
              transition: "transform 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>🤖</div>
              <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "700" }}>HR Interview AI</h3>
              <p style={{ margin: 0, fontSize: "13px", opacity: 0.9, lineHeight: "1.5" }}>
                Practice mock interviews, get real-time AI feedback and scores, and review your evaluation reports.
              </p>
            </a>

            <div style={{
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              minHeight: "400px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ color: "#2c3e50", margin: 0 }}>🔔 Inbox</h2>
                {notifications.some(n => !n.is_read) && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ background: "none", border: "none", color: "#3498db", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ color: "#aaa", textAlign: "center", paddingTop: "80px" }}>No notifications yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", maxHeight: "450px" }}>
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      style={{
                        padding: "14px",
                        borderLeft: notif.is_read ? "3px solid #ccc" : "3px solid #3498db",
                        backgroundColor: notif.is_read ? "#fafafa" : "#e0f2fe",
                        borderRadius: "8px",
                        fontSize: "13px",
                        color: "#34495e"
                      }}
                    >
                      <div style={{ fontWeight: notif.is_read ? "normal" : "bold", lineHeight: "1.5" }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: "11px", color: "#95a5a6", marginTop: "6px" }}>
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Navigation footer component */}
      <PageNavigation
        next={{
          path: "/employees",
          label: "Employees"
        }}
      />
    </div>
  );
}