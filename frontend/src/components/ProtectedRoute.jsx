import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#f4f6f9",
        color: "#2c3e50",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          border: "4px solid rgba(0,0,0,0.1)",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          borderLeftColor: "#3498db",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ marginTop: "15px", fontWeight: "600" }}>Loading session...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center",
        background: "#f8f9fc",
        minHeight: "80vh",
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ fontSize: "70px", marginBottom: "20px" }}>🛡️</div>
        <h1 style={{ color: "#e74c3c", fontSize: "32px", marginBottom: "10px", fontWeight: "700" }}>
          Access Denied
        </h1>
        <p style={{ color: "#5a5c69", fontSize: "16px", maxWidth: "500px", margin: "0 auto 30px" }}>
          You do not have the required permissions ({allowedRoles.join(", ")}) to access this page. If you believe this is an error, please contact your Administrator.
        </p>
        <a href="/" style={{
          backgroundColor: "#3498db",
          color: "white",
          padding: "12px 30px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "14px",
          boxShadow: "0 4px 10px rgba(52,152,219,0.3)",
          transition: "0.2s"
        }}>
          🏠 Back to Safety
        </a>
      </div>
    );
  }

  return children;
}
