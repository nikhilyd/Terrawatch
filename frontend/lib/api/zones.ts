import { CreateZonePayload, ZonesResponse, SingleZoneResponse } from "@/types/zone.types";

const API_URL = "http://localhost:5000/api";

// Custom error for unauthenticated requests (401)
export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const zonesService = {
  
  // 1. Get all protected zones
  getZones: async (): Promise<ZonesResponse> => {
    try {
      const res = await fetch(`${API_URL}/zones`, {
        headers: getHeaders(),
      });
      if (res.status === 401) throw new AuthError("Session expired. Please login again.");
      if (!res.ok) throw new Error(`Failed to fetch zones (${res.status})`);
      return await res.json();
    } catch (error) {
      if (error instanceof AuthError) throw error; // Re-throw so page can redirect
      console.error("Error fetching zones:", error);
      return { success: false, count: 0, data: [] };
    }
  },

  // 2. Create a new protected zone (Triggers ML monitoring)
  createZone: async (payload: CreateZonePayload): Promise<SingleZoneResponse> => {
    try {
      const res = await fetch(`${API_URL}/zones`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create zone");
      return data;
    } catch (error: any) {
      console.error("Error creating zone:", error);
      return { success: false, data: null as any };
    }
  },

  // 3. Update an existing zone
  updateZone: async (id: string, payload: Partial<CreateZonePayload>): Promise<SingleZoneResponse> => {
    try {
      const res = await fetch(`${API_URL}/zones/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update zone");
      return data;
    } catch (error: any) {
      console.error("Error updating zone:", error);
      return { success: false, data: null as any };
    }
  },

  // 4. Delete a zone
  deleteZone: async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_URL}/zones/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete zone");
      return data;
    } catch (error: any) {
      console.error("Error deleting zone:", error);
      return { success: false, message: error.message };
    }
  }

};
