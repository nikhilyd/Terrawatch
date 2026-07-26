/**
 * GIS Controller
 * ---------------
 * Feature 1: KML Export  — GET /api/gis/zone/:id/kml      (Google Earth)
 * Feature 2: GeoJSON     — GET /api/gis/zone/:id/geojson  (ArcGIS/QGIS)
 * Feature 3: All Zones   — GET /api/gis/all/geojson       (Full map)
 */

import { Response }   from 'express';
import Zone            from '../models/Zone';
import Scan            from '../models/Scan';
import Alert           from '../models/Alert';
import { AuthRequest } from '../middleware/auth.middleware';

// ── Color by risk ─────────────────────────────────────────────────────────────
const riskColor = (lossPct: number, alerts: number): string => {
  const score = lossPct * 2 + alerts * 5;
  if (score >= 75) return '#c62828';   // Critical — red
  if (score >= 50) return '#e65100';   // High — orange
  if (score >= 25) return '#f9a825';   // Medium — yellow
  return '#2d7a4f';                    // Low — green
};

// ── Feature 2: GeoJSON (single zone) ─────────────────────────────────────────
// GET /api/gis/zone/:id/geojson
export const getZoneGeoJSON = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    const [latestScan, alertCount] = await Promise.all([
      Scan.findOne({ zoneId: zone._id, status: 'completed' }).sort({ createdAt: -1 }),
      Alert.countDocuments({ zoneId: zone._id }),
    ]);

    const lossPct = latestScan?.results?.forestPercentage
      ? Math.max(0, 100 - (latestScan.results.forestPercentage as number))
      : 0;

    const feature = buildFeature(zone, latestScan, alertCount, lossPct);

    res.setHeader('Content-Type', 'application/geo+json');
    res.setHeader('Content-Disposition', `attachment; filename="${zone.name.replace(/\s+/g, '_')}.geojson"`);
    res.json({ type: 'FeatureCollection', features: [feature] });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── Feature 3: All Zones GeoJSON ─────────────────────────────────────────────
// GET /api/gis/all/geojson
export const getAllZonesGeoJSON = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zones = await Zone.find({ isActive: true });

    const features = await Promise.all(zones.map(async (zone) => {
      const [latestScan, alertCount] = await Promise.all([
        Scan.findOne({ zoneId: zone._id, status: 'completed' }).sort({ createdAt: -1 }),
        Alert.countDocuments({ zoneId: zone._id }),
      ]);
      const lossPct = latestScan?.results?.forestPercentage
        ? Math.max(0, 100 - (latestScan.results.forestPercentage as number))
        : 0;
      return buildFeature(zone, latestScan, alertCount, lossPct);
    }));

    res.setHeader('Content-Type', 'application/geo+json');
    res.setHeader('Content-Disposition', 'attachment; filename="ecowatch_all_zones.geojson"');
    res.json({ type: 'FeatureCollection', features });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── Feature 1: KML Export ─────────────────────────────────────────────────────
// GET /api/gis/zone/:id/kml
export const getZoneKML = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    const [latestScan, alertCount] = await Promise.all([
      Scan.findOne({ zoneId: zone._id, status: 'completed' }).sort({ createdAt: -1 }),
      Alert.countDocuments({ zoneId: zone._id }),
    ]);

    const lossPct     = latestScan?.results?.forestPercentage
      ? Math.max(0, 100 - (latestScan.results.forestPercentage as number))
      : 0;
    const color       = riskColor(lossPct, alertCount);
    const kmlColor    = color.replace('#', 'ff').toUpperCase();  // KML AABBGGRR format
    const threats     = (latestScan?.results?.threats as string[] ?? []).join(', ') || 'None';
    const { lng_min, lat_min, lng_max, lat_max } = zone.bbox;

    // Zone polygon coordinates (rectangle from bbox)
    const coords = [
      `${lng_min},${lat_min},0`,
      `${lng_max},${lat_min},0`,
      `${lng_max},${lat_max},0`,
      `${lng_min},${lat_max},0`,
      `${lng_min},${lat_min},0`,
    ].join(' ');

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>EcoWatch — ${zone.name}</name>
    <description>EcoWatch Deforestation Monitoring — ${new Date().toLocaleDateString('en-IN')}</description>

    <Style id="zoneStyle">
      <LineStyle>
        <color>ff${kmlColor.slice(1, 7)}</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>66${kmlColor.slice(1, 7)}</color>
      </PolyStyle>
    </Style>

    <Placemark>
      <name>${zone.name}</name>
      <description><![CDATA[
        <b>Zone:</b> ${zone.name}<br/>
        <b>Area:</b> ${zone.area_km2?.toFixed(2) ?? 'N/A'} km²<br/>
        <b>Forest Coverage:</b> ${latestScan?.results?.forestPercentage?.toFixed(1) ?? 'N/A'}%<br/>
        <b>NDVI Mean:</b> ${latestScan?.results?.ndviMean?.toFixed(4) ?? 'N/A'}<br/>
        <b>Active Threats:</b> ${threats}<br/>
        <b>Severity:</b> ${latestScan?.results?.severity ?? 'N/A'}<br/>
        <b>Total Alerts:</b> ${alertCount}<br/>
        <b>Last Scan:</b> ${latestScan?.scanDate?.toLocaleDateString('en-IN') ?? 'Never'}<br/>
        <b>AI Analysis:</b> ${latestScan?.results?.description ?? 'N/A'}
      ]]></description>
      <styleUrl>#zoneStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

    <Placemark>
      <name>${zone.name} (Center)</name>
      <Point>
        <coordinates>${zone.coordinates?.lng},${zone.coordinates?.lat},0</coordinates>
      </Point>
    </Placemark>

  </Document>
</kml>`;

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${zone.name.replace(/\s+/g, '_')}.kml"`);
    res.send(kml);

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/gis/all/kml — All zones KML ────────────────────────────────────
export const getAllZonesKML = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zones = await Zone.find({ isActive: true });

    const placemarks = await Promise.all(zones.map(async (zone) => {
      const [latestScan, alertCount] = await Promise.all([
        Scan.findOne({ zoneId: zone._id, status: 'completed' }).sort({ createdAt: -1 }),
        Alert.countDocuments({ zoneId: zone._id }),
      ]);
      const lossPct  = latestScan?.results?.forestPercentage
        ? Math.max(0, 100 - (latestScan.results.forestPercentage as number))
        : 0;
      const color    = riskColor(lossPct, alertCount);
      const threats  = (latestScan?.results?.threats as string[] ?? []).join(', ') || 'None';
      const { lng_min, lat_min, lng_max, lat_max } = zone.bbox;
      const coords   = `${lng_min},${lat_min},0 ${lng_max},${lat_min},0 ${lng_max},${lat_max},0 ${lng_min},${lat_max},0 ${lng_min},${lat_min},0`;
      const styleId  = lossPct > 15 ? 'critical' : lossPct > 5 ? 'high' : lossPct > 0 ? 'medium' : 'safe';

      return `
    <Placemark>
      <name>${zone.name}</name>
      <description><![CDATA[
        <b>Forest:</b> ${latestScan?.results?.forestPercentage?.toFixed(1) ?? 'N/A'}%
        | <b>Threats:</b> ${threats}
        | <b>Alerts:</b> ${alertCount}
        | <b>Last Scan:</b> ${latestScan?.scanDate?.toLocaleDateString('en-IN') ?? 'Never'}
      ]]></description>
      <styleUrl>#${styleId}</styleUrl>
      <Polygon>
        <outerBoundaryIs><LinearRing>
          <coordinates>${coords}</coordinates>
        </LinearRing></outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    }));

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>EcoWatch — All Monitoring Zones</name>
    <description>EcoWatch Deforestation Risk Map — ${new Date().toLocaleDateString('en-IN')}</description>
    <Style id="critical"><LineStyle><color>ff2828c6</color><width>3</width></LineStyle><PolyStyle><color>662828c6</color></PolyStyle></Style>
    <Style id="high"><LineStyle><color>ff0051e6</color><width>2</width></LineStyle><PolyStyle><color>660051e6</color></PolyStyle></Style>
    <Style id="medium"><LineStyle><color>ff0025f9</color><width>2</width></LineStyle><PolyStyle><color>660025f9</color></PolyStyle></Style>
    <Style id="safe"><LineStyle><color>ff4f7a2d</color><width>2</width></LineStyle><PolyStyle><color>664f7a2d</color></PolyStyle></Style>
    ${placemarks.join('\n')}
  </Document>
</kml>`;

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', 'attachment; filename="ecowatch_all_zones.kml"');
    res.send(kml);

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── Helper: Build GeoJSON Feature ────────────────────────────────────────────
const buildFeature = (zone: any, latestScan: any, alertCount: number, lossPct: number) => {
  const { lng_min, lat_min, lng_max, lat_max } = zone.bbox;
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [lng_min, lat_min], [lng_max, lat_min],
        [lng_max, lat_max], [lng_min, lat_max],
        [lng_min, lat_min],
      ]],
    },
    properties: {
      id:              zone._id,
      name:            zone.name,
      description:     zone.description,
      area_km2:        zone.area_km2,
      forestPct:       latestScan?.results?.forestPercentage ?? null,
      vegetationPct:   latestScan?.results?.vegetationPercentage ?? null,
      bareSoilPct:     latestScan?.results?.bareSoilPercentage ?? null,
      waterPct:        latestScan?.results?.waterPercentage ?? null,
      ndviMean:        latestScan?.results?.ndviMean ?? null,
      threats:         latestScan?.results?.threats ?? [],
      severity:        latestScan?.results?.severity ?? null,
      aiDescription:   latestScan?.results?.description ?? null,
      alertCount,
      lastScan:        latestScan?.scanDate ?? null,
      riskColor:       riskColor(lossPct, alertCount),
      center:          [zone.coordinates?.lng, zone.coordinates?.lat],
    },
  };
};
