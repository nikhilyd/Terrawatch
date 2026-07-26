import { ScansResponse, SingleScanResponse, TriggerScanPayload, TriggerScanResponse } from "@/types/scan.types";

const API_URL = "http://localhost:5000/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const scansService = {
  
  // 1. Get all scans globally (optional filters)
  getAllScans: async (zoneId?: string, status?: string): Promise<ScansResponse> => {
    try {
      let url = `${API_URL}/scans?`;
      if (zoneId) url += `zone=${zoneId}&`;
      if (status) url += `status=${status}&`;

      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch scans");
      return await res.json();
    } catch (error) {
      console.error("Error fetching scans:", error);
      return { success: false, count: 0, data: [] };
    }
  },

  // 2. Get scans specifically by Zone ID
  getScansByZone: async (zoneId: string): Promise<ScansResponse> => {
    try {
      const res = await fetch(`${API_URL}/scans/zone/${zoneId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch scans for zone");
      return await res.json();
    } catch (error) {
      console.error("Error fetching scans by zone:", error);
      return { success: false, count: 0, data: [] };
    }
  },

  // 3. Get single scan by ID
  getScanById: async (scanId: string): Promise<SingleScanResponse> => {
    try {
      const res = await fetch(`${API_URL}/scans/${scanId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch scan");
      return await res.json();
    } catch (error: any) {
      console.error("Error fetching single scan:", error);
      return { success: false, data: null as any };
    }
  },

  // 4. Trigger a manual ML scan
  triggerScan: async (payload: TriggerScanPayload): Promise<TriggerScanResponse> => {
    try {
      const res = await fetch(`${API_URL}/scans/trigger`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to trigger scan");
      return data;
    } catch (error: any) {
      console.error("Error triggering scan:", error);
      return { success: false, message: error.message };
    }
  },

  // 5. Retry a failed scan
  retryScan: async (scanId: string): Promise<TriggerScanResponse> => {
    try {
      const res = await fetch(`${API_URL}/scans/${scanId}/retry`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to retry scan");
      return data;
    } catch (error: any) {
      console.error("Error retrying scan:", error);
      return { success: false, message: error.message };
    }
  },

  // 6. Trigger scans for all active zones
  triggerAllScans: async (): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
      const res = await fetch(`${API_URL}/scans/trigger-all`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to trigger all scans");
      return data;
    } catch (error: any) {
      console.error("Error triggering all scans:", error);
      return { success: false, message: error.message };
    }
  }

};
