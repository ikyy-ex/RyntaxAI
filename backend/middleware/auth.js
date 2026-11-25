const jwt = require('jsonwebtoken');
const { JWT_SECRET, NODE_ENV } = require('../config/env');

const COOKIE_NAME = 'ryntax_token';

function issueSessionCookie(res, user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'Strict',
    secure: NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  return token;
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'Strict',
    secure: NODE_ENV === 'production',
    path: '/'
  });
}

function extractUserFromRequest(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function optionalAuth(req, _res, next) {
  req.user = extractUserFromRequest(req);
  next();
}

function requireAuth(req, res, next) {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({
      error: 'Sesi tidak valid atau Anda belum masuk. Silakan login terlebih dahulu.'
    });
  }
  req.user = user;
  return next();
}

module.exports = {
  issueSessionCookie,
  clearSessionCookie,
  optionalAuth,
  requireAuth
};
