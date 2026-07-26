"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const env = {
    PORT: process.env.PORT || '5000',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/ecowatch',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    KAFKA_BROKER: process.env.KAFKA_BROKER || 'localhost:9092',
    KAFKA_GROUP: process.env.KAFKA_GROUP || 'node-consumers',
    KAFKA_TOPIC_PRODUCE: process.env.KAFKA_TOPIC_PRODUCE || 'scan-jobs',
    KAFKA_TOPIC_CONSUME: process.env.KAFKA_TOPIC_CONSUME || 'scan-results',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads/',
    // OpenAI GPT-4o Vision (replaces local Qwen2-VL model)
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    // Sentinel Hub (real satellite imagery)
    SH_CLIENT_ID: process.env.SH_CLIENT_ID || '',
    SH_CLIENT_SECRET: process.env.SH_CLIENT_SECRET || '',
};
exports.default = env;
//# sourceMappingURL=env.js.map