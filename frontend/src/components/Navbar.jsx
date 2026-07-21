import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const linkStyle = (path) => ({
    color: location.pathname === path ? "#3498db" : "white",
    textDecoration: "none",
    fontWeight: location.pathname === path ? "700" : "400",
    padding: "6px 14px",
    borderRadius: "6px",
    background: location.pathname === path ? "rgba(255,255,255,0.15)" : "transparent",
    transition: "0.2s",
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav
      style={{
        backgroundColor: "#2c3e50",
        padding: "15px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <h2 style={{ color: "white", margin: 0, marginRight: "20px", fontSize: "20px" }}>💰 Payroll System</h2>
        {user && (
          <>
            <Link to="/" style={linkStyle("/")}>🏠 Home</Link>
            <Link to="/employees" style={linkStyle("/employees")}>👨‍💼 Employees</Link>
            <Link to="/payroll" style={linkStyle("/payroll")}>💵 Payroll</Link>
            <Link to="/reports" style={linkStyle("/reports")}>📊 Reports</Link>
            <Link to="/employee-docs" style={linkStyle("/employee-docs")}>📁 Employee Docs</Link>
          </>
        )}
      </div>

      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <span style={{ color: "white", fontSize: "14px" }}>
            👋 Hi, <Link to="/profile" style={{ color: "#3498db", fontWeight: "600", textDecoration: "none" }}>{user.name}</Link> ({user.role})
          </span>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "#e74c3c",
              color: "white",
              border: "none",
              padding: "7px 15px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            Logout 🚪
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;