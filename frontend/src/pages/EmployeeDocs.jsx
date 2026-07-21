// frontend/src/pages/EmployeeDocs.jsx

import EmployeeDocUpload from "../components/EmployeeDocUpload";
import AskEmployeeDoc from "../components/AskEmployeeDoc";

export default function EmployeeDocs() {
  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "5px" }}>
        📁 Employee Documents
      </h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>
        Upload employee documents and ask questions using AI
      </p>

      {/* Divider */}
      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>

        {/* Left — Upload */}
        <div style={{
          flex: 1, minWidth: "300px",
          padding: "20px", border: "1px solid #ddd",
          borderRadius: "10px", background: "#fafafa"
        }}>
          <EmployeeDocUpload />
        </div>

        {/* Right — Ask */}
        <div style={{
          flex: 1, minWidth: "300px",
          padding: "20px", border: "1px solid #ddd",
          borderRadius: "10px", background: "#fafafa"
        }}>
          <AskEmployeeDoc />
        </div>

      </div>
    </div>
  );
}