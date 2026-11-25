const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const AVAILABLE_MODELS = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'Rekomendasi',
    description: 'Cepat, cerdas, dan multimodal untuk chat, analisis dokumen, gambar & coding.',
    supportsVision: true
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'Pro Reasoning',
    description: 'Penalaran mendalam untuk matematika kompleks, arsitektur kode & riset.',
    supportsVision: true
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    badge: 'Ultra Cepat',
    description: 'Latensi sangat rendah dan hemat kuota untuk respons instan.',
    supportsVision: true
  }
];

const DEFAULT_MODEL = 'gemini-2.5-flash';

function isGeminiConfigured() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  return Boolean(key && key !== 'your_gemini_api_key_here' && key.length > 15);
}

function isSupabaseConfigured() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return Boolean(url && key && url.startsWith('https://'));
}

const jwtSecret =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16
    ? process.env.JWT_SECRET
    : crypto.createHash('sha256').update('ryntax-ai-dev-fallback-secret').digest('hex');

module.exports = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_API_KEY: (process.env.GEMINI_API_KEY || '').trim(),
  SUPABASE_URL: (process.env.SUPABASE_URL || '').trim(),
  SUPABASE_SERVICE_ROLE_KEY: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  JWT_SECRET: jwtSecret,
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  isGeminiConfigured,
  isSupabaseConfigured
};
