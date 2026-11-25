const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net'
      ],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Terlalu banyak permintaan AI dalam 1 menit. Silakan tunggu sebentar sebelum mencoba lagi.'
  }
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Terlalu banyak percobaan autentikasi. Silakan coba lagi dalam 15 menit.'
  }
});

function csrfMiddleware(req, res, next) {
  let token = req.cookies && req.cookies.ryntax_csrf;
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie('ryntax_csrf', token, {
      httpOnly: false,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
  }

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const headerToken = req.headers['x-csrf-token'];
  if (!headerToken || headerToken !== token) {
    return res.status(403).json({
      error: 'Validasi keamanan CSRF gagal. Muat ulang halaman lalu coba kembali.'
    });
  }

  return next();
}

function sanitizeText(value, maxLength = 32000) {
  if (typeof value !== 'string') return '';
  return value.replace(/\0/g, '').trim().slice(0, maxLength);
}

module.exports = {
  helmetMiddleware,
  aiRateLimiter,
  authRateLimiter,
  csrfMiddleware,
  sanitizeText
};
