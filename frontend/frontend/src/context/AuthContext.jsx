import { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../services/api";
import axios from "axios";

const AuthContext = createContext();
const API_BASE_URL = "http://localhost:5000/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          console.log("🔍 Checking auth with token...");
          const response = await authAPI.getMe();
          setUser(response.data.user);
          console.log("✅ Auth verified:", response.data.user);
        } catch (error) {
          console.error("❌ Auth check failed:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("userType");
          setToken(null);
          setUser(null);
        }
      } else {
        console.log("⚠️ No token found, user not authenticated");
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      localStorage.setItem("token", response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Registration failed",
      };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const token = response.data.token;

      localStorage.setItem("token", token);
      localStorage.setItem("userType", "student");
      setToken(token);
      setUser(response.data.user);

      console.log("✅ Student logged in:", response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  };

  // ✅ NEW: Organizer login function
  const organizerLogin = async (email, password) => {
    try {
      console.log("🔐 Organizer login attempt...");

      // ✅ Create temporary axios instance to call organizer endpoint
      const response = await axios.post(`${API_BASE_URL}/organizers/login`, {
        email: email.toLowerCase(),
        password,
      });

      console.log("✅ Organizer response:", response.data);

      if (response.data.success) {
        const token = response.data.token;
        const organizerData = response.data.organizer;

        // ✅ Save to localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("userType", "organizer");
        localStorage.setItem("organizer", JSON.stringify(organizerData));

        // ✅ Update auth context
        // Convert organizer data to user-like format
        const userData = {
          id: organizerData.id,
          email: organizerData.email,
          clubName: organizerData.clubName,
          role: "organizer",
        };

        setToken(token);
        setUser(userData);

        console.log("✅ Organizer logged in:", userData);
        return { success: true };
      }
    } catch (error) {
      console.error("❌ Organizer login error:", error);
      console.error("Response:", error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userType");
    localStorage.removeItem("organizer");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        organizerLogin, // ✅ Expose organizer login
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
