import {
  Campaign,
  PreviewDatesResponse,
  HistoricalResult,
} from "@/types/campaign.types";

const API_URL = "http://localhost:5000/api";
const ML_URL = "http://localhost:8001/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

// ── Campaign API Service ─────────────────────────────────────────────────────
export const campaignService = {

  // Calculate scan dates — no DB write, pure preview
  previewDates: async (
    startDate: string,
    endDate: string,
    scanCount: number,
    bbox?: number[],
  ): Promise<PreviewDatesResponse> => {
    try {
      const res = await fetch(`${API_URL}/campaigns/preview-dates`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ startDate, endDate, scanCount, bbox }),
      });
      return await res.json();
    } catch (error) {
      console.error("previewDates error:", error);
      return { success: false, message: "Network error" };
    }
  },

  // Create a new campaign
  createCampaign: async (payload: {
    name: string;
    zoneId: string;
    startDate: string;
    endDate: string;
    scanCount: number;
    resolution?: number;
    maxCloudCover?: number;
    retryIfCloudy?: boolean;
    alertEmail?: string;
    alertThreshold?: number;
  }): Promise<{ success: boolean; data?: Campaign; message?: string }> => {
    try {
      const res = await fetch(`${API_URL}/campaigns`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (error) {
      console.error("createCampaign error:", error);
      return { success: false, message: "Network error" };
    }
  },

  // List all campaigns
  getCampaigns: async (): Promise<{ success: boolean; data: Campaign[]; count: number }> => {
    try {
      const res = await fetch(`${API_URL}/campaigns`, { headers: getHeaders() });
      return await res.json();
    } catch (error) {
      console.error("getCampaigns error:", error);
      return { success: false, data: [], count: 0 };
    }
  },

  // Get single campaign detail
  getCampaign: async (id: string): Promise<{ success: boolean; data?: Campaign }> => {
    try {
      const res = await fetch(`${API_URL}/campaigns/${id}`, { headers: getHeaders() });
      return await res.json();
    } catch (error) {
      console.error("getCampaign error:", error);
      return { success: false };
    }
  },

  // Pause / Resume toggle
  togglePause: async (id: string): Promise<{ success: boolean; data?: { status: string } }> => {
    try {
      const res = await fetch(`${API_URL}/campaigns/${id}/pause`, {
        method: "PATCH",
        headers: getHeaders(),
      });
      return await res.json();
    } catch (error) {
      console.error("togglePause error:", error);
      return { success: false };
    }
  },

  // Delete campaign
  deleteCampaign: async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_URL}/campaigns/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return await res.json();
    } catch (error) {
      console.error("deleteCampaign error:", error);
      return { success: false };
    }
  },
};

// ── Historical Analysis Service ──────────────────────────────────────────────
export const historicalService = {

  analyze: async (payload: {
    zone_id: string;
    bbox: number[];
    dates: string[];
    resolution?: number;
    max_cloud_pct?: number;
  }): Promise<{ success: boolean; data?: HistoricalResult; error?: string }> => {
    try {
      const res = await fetch(`${ML_URL}/historical/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.detail || `HTTP ${res.status}` };
      }
      const data = await res.json();
      return { success: true, data };
    } catch (error: any) {
      console.error("historical analyze error:", error);
      return { success: false, error: error.message || "Network error" };
    }
  },
};

// ── Historical Analysis Save Service (Node.js / MongoDB) ─────────────────────
export interface SavedAnalysis {
  _id: string;
  zoneId: string;
  zoneName: string;
  bbox: number[];
  dates: string[];
  resolution: number;
  scans: any[];
  summary: {
    total_loss_pct: number;
    total_loss_ha: number;
    rate_per_year: number;
    biggest_drop_pct: number;
    biggest_drop_date: string;
    scans_done: number;
    scans_skipped: number;
  };
  ai_verdict: string;
  createdAt: string;
}

export const historicalSaveService = {

  // Save completed analysis to MongoDB
  saveAnalysis: async (payload: {
    zoneId: string;
    zoneName: string;
    bbox: number[];
    dates: string[];
    resolution: number;
    scans: any[];
    summary: any;
    ai_verdict: string;
  }): Promise<{ success: boolean; data?: SavedAnalysis; message?: string }> => {
    try {
      const res = await fetch(`${API_URL}/historical`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (error) {
      console.error("saveAnalysis error:", error);
      return { success: false, message: "Network error" };
    }
  },

  // List all saved analyses (summary only)
  getAnalyses: async (): Promise<{ success: boolean; data: SavedAnalysis[]; count: number }> => {
    try {
      const res = await fetch(`${API_URL}/historical`, { headers: getHeaders() });
      return await res.json();
    } catch (error) {
      console.error("getAnalyses error:", error);
      return { success: false, data: [], count: 0 };
    }
  },

  // Full detail with all scans + image URLs
  getAnalysis: async (id: string): Promise<{ success: boolean; data?: SavedAnalysis }> => {
    try {
      const res = await fetch(`${API_URL}/historical/${id}`, { headers: getHeaders() });
      return await res.json();
    } catch (error) {
      console.error("getAnalysis error:", error);
      return { success: false };
    }
  },

  // Delete
  deleteAnalysis: async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_URL}/historical/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return await res.json();
    } catch (error) {
      console.error("deleteAnalysis error:", error);
      return { success: false };
    }
  },

  // All analyses for a specific zone (for satellite comparison in field page)
  getAnalysesByZone: async (zoneId: string): Promise<{ success: boolean; data: SavedAnalysis[]; count: number }> => {
    try {
      const res = await fetch(`${API_URL}/historical/zone/${zoneId}`, { headers: getHeaders() });
      return await res.json();
    } catch (error) {
      console.error("getAnalysesByZone error:", error);
      return { success: false, data: [], count: 0 };
    }
  },
};

