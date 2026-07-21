import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const user = await login(email, password); // returns user object with role

      // ✅ Role-based redirect
      if (user.role === "admin") navigate("/");
      else if (user.role === "hr") navigate("/");
      else if (user.role === "hod") navigate("/");
      else navigate("/"); // employee — can change to "/profile" if needed

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick fill demo credentials
  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "90vh",
      background: "radial-gradient(circle at 10% 20%, rgb(43, 61, 79) 0%, rgb(24, 32, 43) 90%)",
      fontFamily: "'Inter', sans-serif",
      padding: "20px",
      boxSizing: "border-box"
    }}>
      <div style={{
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        padding: "45px 35px",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
        width: "100%",
        maxWidth: "420px",
        textAlign: "center",
        boxSizing: "border-box"
      }}>
        <div style={{ fontSize: "50px", marginBottom: "10px" }}>💰</div>
        <h2 style={{ color: "#2c3e50", fontSize: "26px", margin: "0 0 10px", fontWeight: "700" }}>
          Payroll Portal
        </h2>
        <p style={{ color: "#7f8c8d", fontSize: "14px", margin: "0 0 25px" }}>
          Enter credentials to access the system
        </p>

        {error && (
          <div style={{
            backgroundColor: "#fde8e8",
            border: "1px solid #f8b4b4",
            color: "#c81e1e",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "20px",
            textAlign: "left",
            fontWeight: "500"
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ textAlign: "left" }}>
            <label style={{
              fontSize: "12px", fontWeight: "600", color: "#34495e",
              display: "block", marginBottom: "6px"
            }}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              placeholder="e.g. admin@payroll.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%", padding: "12px 16px",
                border: "1px solid #d1d5db", borderRadius: "8px",
                fontSize: "14px", boxSizing: "border-box", outline: "none"
              }}
              required
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <label style={{
              fontSize: "12px", fontWeight: "600", color: "#34495e",
              display: "block", marginBottom: "6px"
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%", padding: "12px 16px",
                border: "1px solid #d1d5db", borderRadius: "8px",
                fontSize: "14px", boxSizing: "border-box", outline: "none"
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: submitting ? "#95a5a6" : "#2c3e50",
              color: "white", padding: "14px", border: "none",
              borderRadius: "8px", fontSize: "15px", fontWeight: "600",
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(44,62,80,0.2)", marginTop: "10px"
            }}
          >
            {submitting ? "⏳ Signing in..." : "🔐 Secure Sign In"}
          </button>
        </form>

        {/* ✅ Demo accounts — click to auto-fill */}
        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px dashed #cbd5e1",
          borderRadius: "8px",
          padding: "14px",
          marginTop: "24px",
          fontSize: "12px",
          color: "#475569",
          textAlign: "left"
        }}>
          <div style={{ fontWeight: "700", marginBottom: "10px", color: "#1e293b" }}>
            💡 Demo Accounts — click to fill:
          </div>

          {[
            { role: "Admin", email: "admin@payroll.com", color: "#e74c3c" },
            { role: "HR", email: "hr@payroll.com", color: "#2980b9" },
            { role: "HOD", email: "hod@payroll.com", color: "#8e44ad" },
            { role: "Employee", email: "john@payroll.com", color: "#27ae60" },
          ].map(({ role, email: demoEmail, color }) => (
            <div
              key={role}
              onClick={() => fillDemo(demoEmail, "password123")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                marginBottom: "4px",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{
                backgroundColor: color,
                color: "white",
                padding: "2px 7px",
                borderRadius: "10px",
                fontSize: "10px",
                fontWeight: "700",
                minWidth: "55px",
                textAlign: "center"
              }}>
                {role}
              </span>
              <span style={{ color: "#334155" }}>{demoEmail}</span>
            </div>
          ))}

          <div style={{ marginTop: "8px", color: "#94a3b8", fontSize: "11px" }}>
            🔑 Password for all: <b>password123</b>
          </div>
        </div>
      </div>
    </div>
  );
}