import { UserRole, UsersResponse, SingleUserResponse, DeleteUserResponse } from "@/types/user.types";

const API_URL = "http://localhost:5000/api/users";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const usersService = {
  
  // ── ADMIN ONLY ─────────────────────────────────────────────────────────────
  
  getAllUsers: async (): Promise<UsersResponse> => {
    try {
      const res = await fetch(`${API_URL}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    } catch (error) {
      console.error(error);
      return { success: false, count: 0, data: [] };
    }
  },

  updateUserRole: async (id: string, role: UserRole): Promise<SingleUserResponse> => {
    try {
      const res = await fetch(`${API_URL}/${id}/role`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ role }),
      });
      return await res.json();
    } catch (error) {
      console.error(error);
      return { success: false, message: "Network error" };
    }
  },

  deleteUser: async (id: string): Promise<DeleteUserResponse> => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return await res.json();
    } catch (error) {
      console.error(error);
      return { success: false, message: "Network error" };
    }
  },

  // ── ANY AUTHENTICATED USER ──────────────────────────────────────────────────

  updateNotifyPrefs: async (prefs: {
    critical?: boolean;
    high?: boolean;
    medium?: boolean;
    low?: boolean;
    digest?: boolean;
  }): Promise<SingleUserResponse> => {
    try {
      const res = await fetch(`${API_URL}/me/notify`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(prefs),
      });
      return await res.json();
    } catch (error) {
      console.error(error);
      return { success: false, message: "Network error" };
    }
  }

};
