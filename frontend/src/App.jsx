import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Employees from "./pages/Employees";
import Payroll from "./pages/Payroll";
import Reports from "./pages/Reports";
import EmployeeDocs from "./pages/EmployeeDocs";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import InterviewAI from "./pages/InterviewAI";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["Admin", "HR Manager", "HOD", "Employee"]}>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["Admin", "HR Manager", "HOD", "Employee"]}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute allowedRoles={["Admin", "HR Manager", "HOD", "Employee"]}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={["Admin", "HR Manager", "HOD"]}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <ProtectedRoute allowedRoles={["Admin", "HR Manager", "HOD", "Employee"]}>
                <Payroll />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["Admin", "HR Manager", "HOD"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee-docs"
            element={
              <ProtectedRoute allowedRoles={["Admin", "HR Manager", "HOD", "Employee"]}>
                <EmployeeDocs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview-ai"
            element={
              <ProtectedRoute allowedRoles={["Admin", "HR Manager", "HOD", "Employee"]}>
                <InterviewAI />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;