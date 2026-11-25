const app = require('./app');
const { PORT, isGeminiConfigured, isSupabaseConfigured } = require('./config/env');

app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`  RYNTAX AI Server berjalan di http://localhost:${PORT}`);
  console.log(`  Gemini API Key : ${isGeminiConfigured() ? 'TERKONFIGURASI' : 'BELUM DIATUR (.env)'}`);
  console.log(`  Database Mode  : ${isSupabaseConfigured() ? 'Supabase PostgreSQL' : 'Local JSON Store'}`);
  console.log('====================================================');
});
