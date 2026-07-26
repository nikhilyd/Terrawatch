import { AlertsResponse, AnalyticsResponse, AlertsOverTimeResponse, GenericResponse } from "@/types/dashboard.types";

const API_URL = "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const dashboardService = {
  async getAlerts(): Promise<AlertsResponse> {
    try {
      const res = await fetch(`${API_URL}/alerts`, {
        headers: getAuthHeaders(),
      });
      return res.json();
    } catch (error) {
      return { success: false, count: 0, data: [] };
    }
  },

  async getThreatDistribution(): Promise<AnalyticsResponse> {
    try {
      const res = await fetch(`${API_URL}/analytics/threat-distribution`, {
        headers: getAuthHeaders(),
      });
      return res.json();
    } catch (error) {
      return { success: false, data: { labels: [], data: [] } };
    }
  },

  async getAlertsOverTime(months: number = 6): Promise<AlertsOverTimeResponse> {
    try {
      const res = await fetch(`${API_URL}/analytics/alerts-over-time?months=${months}`, {
        headers: getAuthHeaders(),
      });
      return res.json();
    } catch (error) {
      return { success: false, data: { labels: [], datasets: [] } };
    }
  },

  async updateAlertStatus(alertId: string, status: "RESOLVED" | "FALSE_ALARM", note?: string): Promise<GenericResponse> {
    try {
      const res = await fetch(`${API_URL}/alerts/${alertId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, resolutionNote: note }),
      });
      return res.json();
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  }
};
