import { CarbonLossResponse, AllRiskScoresResponse, SingleZoneRiskResponse } from "@/types/legal.types";

const API_URL = "http://localhost:5000/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const legalService = {
  
  // 1. Get Carbon & Economic Loss for a specific zone
  getCarbonLoss: async (zoneId: string): Promise<CarbonLossResponse> => {
    try {
      const res = await fetch(`${API_URL}/legal/zone/${zoneId}/carbon`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch carbon loss");
      return await res.json();
    } catch (error: any) {
      console.error("Error fetching carbon loss:", error);
      return { success: false, data: null, message: error.message };
    }
  },

  // 2. Get Global Risk Leaderboard (All Zones)
  getAllRiskScores: async (): Promise<AllRiskScoresResponse> => {
    try {
      const res = await fetch(`${API_URL}/legal/risk-scores`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch risk scores");
      return await res.json();
    } catch (error) {
      console.error("Error fetching all risk scores:", error);
      return { success: false, count: 0, data: [] };
    }
  },

  // 3. Get Risk Score for a single zone
  getZoneRiskScore: async (zoneId: string): Promise<SingleZoneRiskResponse> => {
    try {
      const res = await fetch(`${API_URL}/legal/zone/${zoneId}/risk`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch zone risk score");
      return await res.json();
    } catch (error: any) {
      console.error("Error fetching single zone risk:", error);
      return { success: false, data: null as any };
    }
  },

  // 4. Download FIR Evidence PDF
  downloadFIRReport: async (zoneId: string, zoneName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/legal/zone/${zoneId}/fir`, {
        method: "GET",
        headers: getHeaders(),
      });
      
      if (!res.ok) throw new Error("Failed to generate FIR report");
      
      // Convert response to blob
      const blob = await res.blob();
      
      // Create a temporary link to trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Try to extract filename from headers, otherwise use fallback
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `FIR_Evidence_${zoneName}.pdf`;
      if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
        filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error("Error downloading FIR report:", error);
      return false;
    }
  }

};
