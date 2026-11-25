const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { ALLOWED_ORIGINS } = require('./config/env');
const { helmetMiddleware, csrfMiddleware } = require('./middleware/security');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

app.set('trust proxy', 1);
app.use(helmetMiddleware);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
    },
    credentials: true
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(csrfMiddleware);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/ai', aiRoutes);

// Static Frontend Files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA Fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
  }
  return res.sendFile(path.join(publicDir, 'index.html'));
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    error: err.message || 'Terjadi kesalahan internal pada server.'
  });
});

module.exports = app;
