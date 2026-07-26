import { AuthResponse } from "@/types/auth.types";

const API_URL = "http://localhost:5000/api/auth";

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return res.json();
    } catch (error) {
      return { success: false, message: "Network error. Node service offline." };
    }
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      return res.json();
    } catch (error) {
      return { success: false, message: "Network error. Node service offline." };
    }
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }
};
