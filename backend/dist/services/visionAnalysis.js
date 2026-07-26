"use strict";
/**
 * Vision Analysis Service (OpenAI GPT-4o Vision)
 * ------------------------------------------------
 * Replaces the local Qwen2-VL model with OpenAI's GPT-4o Vision API.
 * Handles:
 *   1. Single image threat analysis (satellite)
 *   2. Dual image comparison (change detection)
 *   3. Field officer ground photo analysis
 *   4. Historical verdict generation (text-only)
 *
 * All responses are structured JSON — same shape as the old Qwen outputs.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImage = analyzeImage;
exports.compareImages = compareImages;
exports.analyzeFieldPhoto = analyzeFieldPhoto;
exports.generateVerdict = generateVerdict;
exports.healthCheck = healthCheck;
const openai_1 = __importDefault(require("openai"));
const env_1 = __importDefault(require("../config/env"));
let _client = null;
function getClient() {
    if (!_client) {
        _client = new openai_1.default({ apiKey: env_1.default.OPENAI_API_KEY });
    }
    return _client;
}
// ── Prompts ───────────────────────────────────────────────────────────────
const SATELLITE_PROMPT = `You are an expert environmental satellite image analyst specializing in tropical rainforest monitoring (Amazon, Congo, SE Asia).

Analyze this Sentinel-2 satellite image for environmental threats.

IMPORTANT VISUAL CUES for tropical forests:
- Dark green = dense healthy forest canopy (GOOD)
- Pink/magenta/red-brown patches = freshly cleared/burned forest land (DEFORESTATION — HIGH RISK)
- Light tan/yellow = bare soil, agricultural fields = cleared land
- Geometric rectangular shapes cut from forest = illegal logging roads or farm plots
- White = clouds (ignore for analysis)
- Blue/dark = water bodies (rivers, lakes)

If you see pink, brown, or tan areas surrounded by dark green forest — that IS active deforestation.
Do NOT describe cleared forest land as "no threats" — cleared patches in rainforest ARE threats.

Respond ONLY with valid JSON in this exact format:
{
  "threats": [],
  "severity": "none",
  "description": "...",
  "affected_areas": [],
  "forest_visible": true,
  "confidence": "high"
}

Rules:
- "threats": array from: ["deforestation", "illegal_mining", "water_pollution", "urban_encroachment", "agricultural_expansion", "none"]
- "severity": one of "none", "low", "medium", "high", "critical"
- "description": 2-3 sentences describing what you observe. Be specific about colors and areas.
- "affected_areas": directions where threats are found: ["north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest", "center", "throughout"]
- "forest_visible": true if dense dark-green forest canopy is visible
- "confidence": "low", "medium", or "high" based on image clarity

If image is mostly white (clouds), set confidence to "low" and threats to ["none"].`;
const COMPARE_PROMPT = `You are an expert environmental satellite image analyst.
You are given TWO satellite images of the SAME area at DIFFERENT times.
IMAGE 1 = older scan | IMAGE 2 = newer (recent) scan.

Compare them carefully. Respond ONLY with valid JSON:
{
  "change_detected": true,
  "change_type": "deforestation",
  "severity": "high",
  "changed_areas": ["northeast", "center"],
  "change_description": "2-3 sentences: what exactly changed, where, how much",
  "probable_cause": "illegal logging"
}

change_type options: deforestation, mining, urban_expansion, agricultural, fire, flooding, none
severity options: none, low, medium, high, critical
If no visible change: change_detected=false, severity=none.`;
const FIELD_PROMPT = `You are an expert field environmental analyst.
A field officer has taken this ground-level photo from a forest or protected area.

Analyze this photo for environmental threats or illegal activities.

Look for:
- Signs of illegal logging (fresh tree stumps, cut logs, chainsaw marks)
- Illegal mining (excavation, machinery, disturbed soil, chemical waste)
- Poaching activity (traps, animal remains, hunting equipment)
- Encroachment (structures, fires, agriculture in forest areas)
- Water pollution (discolored water, chemical dumping, waste)
- Fire damage (burnt vegetation, smoke, ash)
- Healthy forest (dense canopy, no visible threats)

Respond ONLY with valid JSON in this exact format:
{
  "threats": [],
  "severity": "none",
  "description": "...",
  "confidence": "high"
}

Rules:
- "threats": array from: ["illegal_logging", "illegal_mining", "poaching", "encroachment", "water_pollution", "fire", "none"]
- "severity": one of "none", "low", "medium", "high", "critical"
- "description": 2-3 sentences describing exactly what you see in the photo
- "confidence": "low", "medium", or "high" based on image clarity

If the image is blurry, dark, or unclear, set confidence to "low".`;
// ── Default responses ─────────────────────────────────────────────────────
const DEFAULT_THREAT = {
    threats: ['none'], severity: 'none',
    description: 'Analysis could not be completed.',
    affectedAreas: [], forestVisible: false, confidence: 'low',
};
const DEFAULT_COMPARE = {
    changeDetected: false, changeType: 'unknown', severity: 'none',
    changedAreas: [], changeDescription: 'Comparison failed.', probableCause: 'unknown',
};
// ── Core API calls ────────────────────────────────────────────────────────
/**
 * Analyze a single satellite image for environmental threats.
 * @param imageBase64 - base64-encoded PNG/JPEG of the satellite image
 * @returns structured threat analysis
 */
async function analyzeImage(imageBase64) {
    try {
        const client = getClient();
        const response = await client.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 400,
            messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: `data:image/png;base64,${imageBase64}`, detail: 'high' },
                        },
                        { type: 'text', text: SATELLITE_PROMPT },
                    ],
                }],
        });
        const text = response.choices[0]?.message?.content || '';
        return parseJsonResponse(text, DEFAULT_THREAT);
    }
    catch (err) {
        console.error('[Vision] analyzeImage failed:', err?.message);
        return DEFAULT_THREAT;
    }
}
/**
 * Compare two satellite images (old vs new) for change detection.
 * @param imageOldBase64 - base64 of the older scan
 * @param imageNewBase64 - base64 of the newer scan
 * @returns structured comparison result
 */
async function compareImages(imageOldBase64, imageNewBase64) {
    try {
        const client = getClient();
        const response = await client.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 400,
            messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: 'IMAGE 1 (older scan):' },
                        {
                            type: 'image_url',
                            image_url: { url: `data:image/png;base64,${imageOldBase64}`, detail: 'high' },
                        },
                        { type: 'text', text: 'IMAGE 2 (newer scan):' },
                        {
                            type: 'image_url',
                            image_url: { url: `data:image/png;base64,${imageNewBase64}`, detail: 'high' },
                        },
                        { type: 'text', text: COMPARE_PROMPT },
                    ],
                }],
        });
        const text = response.choices[0]?.message?.content || '';
        return parseJsonResponse(text, DEFAULT_COMPARE);
    }
    catch (err) {
        console.error('[Vision] compareImages failed:', err?.message);
        return DEFAULT_COMPARE;
    }
}
/**
 * Analyze a field officer's ground-level photo.
 * @param imageBase64 - base64-encoded photo
 * @param zoneName    - zone name for context
 * @param gps         - GPS coordinates {lat, lng}
 * @param notes       - officer notes
 * @returns structured field analysis
 */
async function analyzeFieldPhoto(imageBase64, zoneName, gps, notes) {
    try {
        const contextParts = [`Zone: ${zoneName}`];
        if (gps)
            contextParts.push(`GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`);
        if (notes)
            contextParts.push(`Officer notes: ${notes}`);
        const context = contextParts.join(' | ');
        const client = getClient();
        const response = await client.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 400,
            messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: `data:image/png;base64,${imageBase64}`, detail: 'high' },
                        },
                        { type: 'text', text: `${FIELD_PROMPT}\n\nContext: ${context}` },
                    ],
                }],
        });
        const text = response.choices[0]?.message?.content || '';
        return parseJsonResponse(text, {
            threats: ['none'], severity: 'none',
            description: 'Analysis complete.', confidence: 'low',
        });
    }
    catch (err) {
        console.error('[Vision] analyzeFieldPhoto failed:', err?.message);
        return {
            threats: ['none'], severity: 'none',
            description: 'AI analysis failed — report saved for manual review.',
            confidence: 'low',
        };
    }
}
/**
 * Generate a text-only verdict from historical scan data.
 * No image needed — just structured data summary.
 */
async function generateVerdict(prompt) {
    try {
        const client = getClient();
        const response = await client.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }],
        });
        return response.choices[0]?.message?.content || 'Analysis complete.';
    }
    catch (err) {
        console.error('[Vision] generateVerdict failed:', err?.message);
        return 'Analysis complete.';
    }
}
// ── JSON parser helper ────────────────────────────────────────────────────
function parseJsonResponse(text, defaultValue) {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    }
    catch {
        // JSON parse failed, return default
    }
    return defaultValue;
}
/**
 * Health check — verify OpenAI API key works.
 */
async function healthCheck() {
    try {
        const client = getClient();
        await client.models.list();
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=visionAnalysis.js.map