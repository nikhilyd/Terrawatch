import { FieldReportResponse, FieldReportsListResponse } from "@/types/field.types";

const API_URL = "http://localhost:5000/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const fieldService = {
  // 1. Submit a new field report
  submitFieldReport: async (formData: FormData): Promise<FieldReportResponse> => {
    try {
      const res = await fetch(`${API_URL}/field/report`, {
        method: "POST",
        headers: getHeaders(), // Note: Do not set Content-Type for FormData, browser sets it with boundary
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit field report");
      return data;
    } catch (error: any) {
      console.error("Error submitting field report:", error);
      return { success: false, data: null as any };
    }
  },

  // 2. Get all field reports (optionally filter by zone)
  getFieldReports: async (zoneId?: string): Promise<FieldReportsListResponse> => {
    try {
      const url = zoneId ? `${API_URL}/field/reports?zone=${zoneId}` : `${API_URL}/field/reports`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch field reports");
      return await res.json();
    } catch (error) {
      console.error("Error fetching field reports:", error);
      return { success: false, count: 0, data: [] };
    }
  }
};
