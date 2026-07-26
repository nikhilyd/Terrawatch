import { PublicStatsResponse, PublicZonesResponse, PublicAlertsResponse } from "@/types/public.types";

const API_URL = "http://localhost:5000/api/public";

// These are completely public endpoints, so NO Authorization headers are needed!
const getHeaders = () => {
  return {
    "Content-Type": "application/json",
  };
};

export const publicService = {
  
  // 1. Get global dashboard stats
  getStats: async (): Promise<PublicStatsResponse> => {
    try {
      const res = await fetch(`${API_URL}/stats`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch public stats");
      return await res.json();
    } catch (error) {
      console.error("Error fetching public stats:", error);
      return { success: false, lastUpdated: "", data: null as any };
    }
  },

  // 2. Get list of monitored zones (safe public data only)
  getZones: async (): Promise<PublicZonesResponse> => {
    try {
      const res = await fetch(`${API_URL}/zones`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch public zones");
      return await res.json();
    } catch (error) {
      console.error("Error fetching public zones:", error);
      return { success: false, count: 0, data: [] };
    }
  },

  // 3. Get recent HIGH and CRITICAL alerts
  getAlerts: async (): Promise<PublicAlertsResponse> => {
    try {
      const res = await fetch(`${API_URL}/alerts`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch public alerts");
      return await res.json();
    } catch (error) {
      console.error("Error fetching public alerts:", error);
      return { success: false, count: 0, data: [] };
    }
  }

};
