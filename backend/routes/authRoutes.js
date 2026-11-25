const express = require('express');
const bcrypt = require('bcryptjs');
const {
  findUserByEmail,
  createUser,
  getUserSettings,
  updateUserSettings
} = require('../services/storageService');
const {
  issueSessionCookie,
  clearSessionCookie,
  optionalAuth,
  requireAuth
} = require('../middleware/auth');
const { authRateLimiter, sanitizeText } = require('../middleware/security');

const router = express.Router();

router.get('/me', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.json({ authenticated: false, user: null, settings: null });
  }
  try {
    const settings = await getUserSettings(req.user.id);
    return res.json({
      authenticated: true,
      user: req.user,
      settings
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name, 80);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = String(req.body?.password || '');

    if (name.length < 2) {
      return res.status(400).json({ error: 'Nama minimal 2 karakter.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Format alamat email tidak valid.' });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Kata sandi harus terdiri dari 6 hingga 128 karakter.' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email tersebut sudah terdaftar. Silakan masuk.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ name, email, passwordHash });
    const settings = await getUserSettings(user.id);
    issueSessionCookie(res, user);

    return res.status(201).json({
      authenticated: true,
      user: { id: user.id, name: user.name, email: user.email },
      settings
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Gagal membuat akun.' });
  }
});

router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email atau kata sandi salah.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email atau kata sandi salah.' });
    }

    const sessionUser = { id: user.id, name: user.name, email: user.email };
    const settings = await getUserSettings(user.id);
    issueSessionCookie(res, sessionUser);

    return res.json({
      authenticated: true,
      user: sessionUser,
      settings
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Gagal masuk ke akun.' });
  }
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ authenticated: false });
});

router.patch('/settings', requireAuth, async (req, res) => {
  try {
    const updated = await updateUserSettings(req.user.id, req.body || {});
    return res.json({ settings: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
