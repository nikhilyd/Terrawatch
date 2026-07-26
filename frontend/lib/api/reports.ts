const API_URL = "http://localhost:5000/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
};

/**
 * Utility to trigger browser file download from Blob
 */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const reportsService = {
  
  // ── STATS ──────────────────────────────────────────────────────────────────
  getZoneExportStats: async (zoneId: string) => {
    try {
      const res = await fetch(`${API_URL}/export/zone/${zoneId}/stats`, { headers: getHeaders() });
      const data = await res.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  },

  // ── RAW DATA EXPORTS (CSV) ──────────────────────────────────────────────────

  exportZoneScansCSV: async (zoneId: string, zoneName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/export/zone/${zoneId}/csv`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download CSV");
      
      const blob = await res.blob();
      downloadBlob(blob, `EcoWatch_${zoneName.replace(/\s+/g, "_")}_Scans.csv`);
      return true;
    } catch (error) {
      console.error("Error exporting Zone CSV:", error);
      return false;
    }
  },

  exportAllAlertsCSV: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/export/alerts/csv`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download CSV");
      
      const blob = await res.blob();
      downloadBlob(blob, "EcoWatch_All_Alerts.csv");
      return true;
    } catch (error) {
      console.error("Error exporting Alerts CSV:", error);
      return false;
    }
  },

  exportZoneHistoricalCSV: async (zoneId: string, zoneName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/export/zone/${zoneId}/historical/csv`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download CSV");
      const blob = await res.blob();
      downloadBlob(blob, `EcoWatch_${zoneName.replace(/\s+/g, "_")}_Historical.csv`);
      return true;
    } catch (error) {
      console.error("Error exporting Zone Historical CSV:", error);
      return false;
    }
  },

  exportZoneFieldReportsCSV: async (zoneId: string, zoneName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/export/zone/${zoneId}/field/csv`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download CSV");
      const blob = await res.blob();
      downloadBlob(blob, `EcoWatch_${zoneName.replace(/\s+/g, "_")}_FieldReports.csv`);
      return true;
    } catch (error) {
      console.error("Error exporting Zone Field Reports CSV:", error);
      return false;
    }
  },

  exportAllHistoricalCSV: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/export/historical/csv`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download CSV");
      const blob = await res.blob();
      downloadBlob(blob, "EcoWatch_All_Historical.csv");
      return true;
    } catch (error) {
      console.error("Error exporting All Historical CSV:", error);
      return false;
    }
  },

  exportAllFieldReportsCSV: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/export/field/csv`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download CSV");
      const blob = await res.blob();
      downloadBlob(blob, "EcoWatch_All_FieldReports.csv");
      return true;
    } catch (error) {
      console.error("Error exporting All Field Reports CSV:", error);
      return false;
    }
  },

  // ── GEOSPATIAL EXPORTS (GIS) ────────────────────────────────────────────────

  exportZoneKML: async (zoneId: string, zoneName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/gis/zone/${zoneId}/kml`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download KML");
      
      const blob = await res.blob();
      downloadBlob(blob, `${zoneName.replace(/\s+/g, "_")}.kml`);
      return true;
    } catch (error) {
      console.error("Error exporting Zone KML:", error);
      return false;
    }
  },

  exportAllZonesKML: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/gis/all/kml`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download KML");
      
      const blob = await res.blob();
      downloadBlob(blob, "ecowatch_all_zones.kml");
      return true;
    } catch (error) {
      console.error("Error exporting all Zones KML:", error);
      return false;
    }
  },

  exportZoneGeoJSON: async (zoneId: string, zoneName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/gis/zone/${zoneId}/geojson`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download GeoJSON");
      
      const blob = await res.blob();
      downloadBlob(blob, `${zoneName.replace(/\s+/g, "_")}.geojson`);
      return true;
    } catch (error) {
      console.error("Error exporting Zone GeoJSON:", error);
      return false;
    }
  },

  exportAllZonesGeoJSON: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/gis/all/geojson`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download GeoJSON");
      
      const blob = await res.blob();
      downloadBlob(blob, "ecowatch_all_zones.geojson");
      return true;
    } catch (error) {
      console.error("Error exporting all Zones GeoJSON:", error);
      return false;
    }
  },

  // ── INTELLIGENCE REPORTS ───────────────────────────────────────────────────

  downloadZoneReportPDF: async (zoneId: string, zoneName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/reports/zone/${zoneId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to download Report PDF");
      
      const blob = await res.blob();
      const filename = `EcoWatch_Report_${zoneName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);
      return true;
    } catch (error) {
      console.error("Error downloading PDF report:", error);
      return false;
    }
  },

  emailZoneReport: async (zoneId: string, toEmail: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/reports/zone/${zoneId}/email`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ toEmail }),
      });
      return res.ok;
    } catch (error) {
      console.error("Error emailing report:", error);
      return false;
    }
  }
};
