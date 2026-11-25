const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../middleware/security');
const {
  listUserChats,
  createChat,
  getChatWithMessages,
  renameChat,
  deleteChat,
  deleteAllUserChats,
  setMessageFeedback
} = require('../services/storageService');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const chats = await listUserChats(req.user.id);
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title || 'Percakapan Baru', 180) || 'Percakapan Baru';
    const toolType = sanitizeText(req.body?.toolType || 'chat', 40) || 'chat';
    const model = sanitizeText(req.body?.model || 'gemini-2.5-flash', 60);
    const chat = await createChat(req.user.id, { title, toolType, model });
    res.status(201).json({ chat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const chat = await getChatWithMessages(req.user.id, req.params.id);
    if (!chat) return res.status(404).json({ error: 'Percakapan tidak ditemukan.' });
    return res.json({ chat });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title, 180);
    if (!title) return res.status(400).json({ error: 'Judul percakapan wajib diisi.' });
    const updated = await renameChat(req.user.id, req.params.id, title);
    if (!updated) return res.status(404).json({ error: 'Percakapan tidak ditemukan.' });
    return res.json({ chat: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/all/clear', async (req, res) => {
  try {
    await deleteAllUserChats(req.user.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteChat(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Percakapan tidak ditemukan.' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:chatId/messages/:messageId/feedback', async (req, res) => {
  try {
    const feedback = req.body?.feedback ?? null;
    const msg = await setMessageFeedback(req.user.id, req.params.chatId, req.params.messageId, feedback);
    if (!msg) return res.status(404).json({ error: 'Pesan tidak ditemukan.' });
    return res.json({ message: msg });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
