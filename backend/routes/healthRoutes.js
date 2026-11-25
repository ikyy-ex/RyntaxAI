const express = require('express');
const {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  isGeminiConfigured,
  isSupabaseConfigured
} = require('../config/env');

const router = express.Router();

router.get('/', (_req, res) => {
  const geminiReady = isGeminiConfigured();
  const supabaseReady = isSupabaseConfigured();

  res.json({
    status: 'ok',
    service: 'RYNTAX AI',
    tagline: 'Your Intelligence, Beyond Limits.',
    geminiConfigured: geminiReady,
    databaseMode: supabaseReady ? 'Supabase PostgreSQL' : 'Local JSON Store',
    defaultModel: DEFAULT_MODEL,
    models: AVAILABLE_MODELS,
    setupHint: geminiReady
      ? null
      : 'GEMINI_API_KEY belum diatur. Salin .env.example menjadi .env, isi GEMINI_API_KEY dari Google AI Studio, lalu restart server.'
  });
});

module.exports = router;
