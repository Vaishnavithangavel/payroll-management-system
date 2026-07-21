import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("payroll_token");
    const storedUser = localStorage.getItem("payroll_user");

    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsedUser);
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post("http://localhost:3000/api/auth/login", {
        email,
        password,
      });

      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem("payroll_token", receivedToken);
      localStorage.setItem("payroll_user", JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      axios.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;

      return receivedUser;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Login failed. Check your credentials."
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("payroll_token");
    localStorage.removeItem("payroll_user");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const updateUserProfile = (updatedUser) => {
    localStorage.setItem("payroll_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};