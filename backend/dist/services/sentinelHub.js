"use strict";
/**
 * Sentinel Hub Process API
 * -------------------------
 * Fetches real Sentinel-2 L2A satellite imagery:
 *   - RGB (B04, B03, B02) — display + OpenAI Vision
 *   - NIR (B08) — NDVI calculation
 *   - RED raw (B04) — accurate NDVI (not display-corrected)
 *   - SCL (Scene Classification Layer) — cloud masking
 *
 * Uses Sentinel Hub Process API v1 with OAuth2 token.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchImage = fetchImage;
exports.healthCheck = healthCheck;
const axios_1 = __importDefault(require("axios"));
const env_1 = __importDefault(require("../config/env"));
const SH_TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const SH_PROCESS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/process';
let _token = null;
let _tokenExpiry = 0;
async function getAccessToken() {
    if (_token && Date.now() < _tokenExpiry) {
        return _token;
    }
    const params = new URLSearchParams({
        client_id: env_1.default.SH_CLIENT_ID,
        client_secret: env_1.default.SH_CLIENT_SECRET,
        grant_type: 'client_credentials',
    });
    const res = await axios_1.default.post(SH_TOKEN_URL, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
    });
    _token = res.data.access_token;
    _tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000; // refresh 1 min early
    return _token;
}
/**
 * Fetch satellite image from Sentinel Hub.
 * Returns RGB (Buffer), NIR, RED raw, SCL as typed arrays.
 */
async function fetchImage(params) {
    const token = await getAccessToken();
    const { bbox, dateFrom, dateTo, resolution = 20 } = params;
    const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [
      { bands: ["B02", "B03", "B04", "B08", "SCL"], units: "DN" }
    ],
    output: [
      { id: "rgb",  bands: 3 },
      { id: "nir",  bands: 1 },
      { id: "red",  bands: 1 },
      { id: "scl",  bands: 1 }
    ]
  };
}

function evaluatePixel(sample) {
  return {
    rgb: [sample.B04 / 3000, sample.B03 / 3000, sample.B02 / 3000],
    nir: [sample.B08 / 10000],
    red: [sample.B04 / 10000],
    scl: [sample.SCL]
  };
}`;
    const requestBody = {
        input: {
            bounds: {
                bbox: bbox,
                properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
            },
            data: [
                {
                    type: 'sentinel-2-l2a',
                    dataFilter: {
                        timeRange: {
                            from: `${dateFrom}T00:00:00Z`,
                            to: `${dateTo}T23:59:59Z`,
                        },
                        mosaickingOrder: 'leastCC',
                    },
                },
            ],
        },
        output: {
            width: 512,
            height: 512,
            responses: [
                { identifier: 'rgb', format: { type: 'image/png' } },
                { identifier: 'nir', format: { type: 'image/tiff' } },
                { identifier: 'red', format: { type: 'image/tiff' } },
                { identifier: 'scl', format: { type: 'image/tiff' } },
            ],
        },
        evalscript,
    };
    const res = await axios_1.default.post(SH_PROCESS_URL, requestBody, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 60000,
    });
    // Parse multipart response (Sentinel Hub returns multipart/related)
    const contentType = String(res.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
        const errData = JSON.parse(Buffer.from(res.data).toString());
        throw new Error(`Sentinel Hub error: ${JSON.stringify(errData)}`);
    }
    const parts = parseMultipartResponse(Buffer.from(res.data), contentType);
    if (parts.length < 4) {
        throw new Error(`Sentinel Hub returned ${parts.length} parts, expected 4 (rgb, nir, red, scl)`);
    }
    const rgbBuf = parts[0].data;
    const nirBuf = parts[1].data;
    const redBuf = parts[2].data;
    const sclBuf = parts[3].data;
    // Parse TIFF data to typed arrays
    const nirTiff = parseTiffFloat32(nirBuf);
    const redTiff = parseTiffFloat32(redBuf);
    const sclTiff = parseTiffUint8(sclBuf);
    return {
        rgb: rgbBuf,
        nir: nirTiff.data,
        redRaw: redTiff.data,
        scl: sclTiff.data,
        width: nirTiff.width,
        height: nirTiff.height,
        metadata: { bbox, dateFrom, dateTo },
    };
}
function parseMultipartResponse(body, contentType) {
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch)
        throw new Error('No boundary in multipart response');
    const boundary = boundaryMatch[1].replace(/"/g, '');
    const boundaryBuf = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = 0;
    while (true) {
        const idx = body.indexOf(boundaryBuf, start);
        if (idx === -1)
            break;
        if (start > 0) {
            const partData = body.subarray(start, idx);
            const headerEnd = partData.indexOf(Buffer.from('\r\n\r\n'));
            if (headerEnd !== -1) {
                const headerStr = partData.subarray(0, headerEnd).toString();
                const headers = {};
                for (const line of headerStr.split('\r\n')) {
                    const colonIdx = line.indexOf(':');
                    if (colonIdx !== -1) {
                        headers[line.substring(0, colonIdx).trim().toLowerCase()] = line.substring(colonIdx + 1).trim();
                    }
                }
                parts.push({ headers, data: partData.subarray(headerEnd + 4) });
            }
        }
        start = idx + boundaryBuf.length + 2; // skip \r\n after boundary
    }
    return parts;
}
// ── Simple TIFF parsers (GeoTIFF from Sentinel Hub is single-strip float32/uint8) ──
function parseTiffFloat32(buf) {
    // Basic TIFF IFD parsing
    const { width, height, stripOffset, stripByteCount } = readTiffHeaders(buf);
    const dataBuf = buf.subarray(stripOffset, stripOffset + stripByteCount);
    const data = new Float32Array(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength / 4);
    return { data, width, height };
}
function parseTiffUint8(buf) {
    const { width, height, stripOffset, stripByteCount } = readTiffHeaders(buf);
    const data = buf.subarray(stripOffset, stripOffset + stripByteCount);
    return { data: new Uint8Array(data), width, height };
}
function readTiffHeaders(buf) {
    const isLittle = buf[0] === 0x49; // 'I' = little-endian
    const readU16 = (off) => isLittle
        ? buf.readUInt16LE(off)
        : buf.readUInt16BE(off);
    const readU32 = (off) => isLittle
        ? buf.readUInt32LE(off)
        : buf.readUInt32BE(off);
    const ifdOffset = readU32(4);
    const entryCount = readU16(ifdOffset);
    let width = 0, height = 0, stripOffset = 0, stripByteCount = 0;
    for (let i = 0; i < entryCount; i++) {
        const entryOff = ifdOffset + 2 + i * 12;
        const tag = readU16(entryOff);
        const type = readU16(entryOff + 2);
        const count = readU32(entryOff + 4);
        let value;
        if (type === 3 && count === 1) {
            value = readU16(entryOff + 8);
        }
        else {
            value = readU32(entryOff + 8);
        }
        switch (tag) {
            case 256:
                width = value;
                break;
            case 257:
                height = value;
                break;
            case 273:
                stripOffset = value;
                break;
            case 279:
                stripByteCount = value;
                break;
        }
    }
    return { width, height, stripOffset, stripByteCount };
}
/**
 * Health check — verify Sentinel Hub credentials work.
 */
async function healthCheck() {
    try {
        await getAccessToken();
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=sentinelHub.js.map