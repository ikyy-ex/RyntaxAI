const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { aiRateLimiter, sanitizeText } = require('../middleware/security');
const { upload, normalizeGeminiMimeType } = require('../middleware/upload');
const { streamGeminiResponse, resolveModel } = require('../services/geminiService');
const { isGeminiConfigured } = require('../config/env');
const {
  createChat,
  getChatWithMessages,
  appendMessage,
  replaceChatMessagesFromIndex,
  getUserSettings
} = require('../services/storageService');

const router = express.Router();

const TOOL_SYSTEM_PROMPTS = {
  chat: '',
  'image-understanding':
    'Anda bertindak sebagai AI Image Understanding. Analisis gambar yang diberikan secara detail, akurat, objektif, dan terstruktur sesuai permintaan pengguna.',
  'coding-assistant':
    'Anda adalah Senior Software Engineer (AI Coding Assistant). Tulis kode bersih, modern, aman, siap produksi, lengkap dengan penjelasan alur kerja dan analisis kompleksitas jika relevan.',
  translator:
    'Anda adalah AI Translator profesional. Terjemahkan teks secara akurat dengan mempertahankan makna, konteks budaya, serta gaya bahasa yang diminta tanpa menambah opini di luar teks.',
  summarizer:
    'Anda adalah AI Summarizer. Rangkum teks atau dokumen secara padat, jelas, bebas bias, dan menyoroti inti informasi terpenting.',
  'writing-assistant':
    'Anda adalah AI Writing Assistant profesional. Bantu menyusun, menyunting, dan menyempurnakan tulisan dengan struktur kuat, diksi tepat, dan alur yang menarik.',
  'homework-assistant':
    'Anda adalah AI Homework Assistant (Tutor Akademik). Jelaskan konsep materi pelajaran secara bertahap, mudah dipahami, dan sertakan contoh penyelesaian langkah demi langkah.',
  'math-solver':
    'Anda adalah AI Math Solver. Selesaikan soal matematika langkah demi langkah menggunakan notasi LaTeX ($...$ dan $$...$$), jelaskan setiap teorema/aturan yang dipakai, dan verifikasi hasil akhirnya.',
  'document-analyzer':
    'Anda adalah AI Document Analyzer. Ekstrak fakta penting, struktur dokumen, angka kunci, dan jawab pertanyaan berdasarkan isi dokumen yang dilampirkan.',
  'idea-generator':
    'Anda adalah AI Idea Generator kreatif dan strategis. Hasilkan ide-ide orisinal, terstruktur, realistis, lengkap dengan konsep eksekusi dan nilai tambah.',
  'story-generator':
    'Anda adalah AI Story Generator (Penulis Fiksi). Tulis cerita yang imersif dengan alur kuat, karakter hidup, dan deskripsi atmosfer yang memikat.',
  'explain-anything':
    'Anda adalah AI Explain Anything. Jelaskan topik apa pun sesuai tingkat pemahaman yang diminta pengguna menggunakan analogi nyata yang jernih dan mudah dicerna.'
};

function setupSseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();
}

function sendSseEvent(res, event, data) {
  if (res.writableEnded) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post(
  '/stream',
  aiRateLimiter,
  optionalAuth,
  (req, res, next) => {
    upload.array('files', 3)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Gagal memproses file unggahan.' });
      }
      return next();
    });
  },
  async (req, res) => {
    if (!isGeminiConfigured()) {
      return res.status(503).json({
        code: 'API_NOT_CONFIGURED',
        error:
          'GEMINI_API_KEY belum dikonfigurasi di server (.env). Tambahkan API Key resmi dari Google AI Studio lalu restart server.'
      });
    }

    const prompt = sanitizeText(req.body?.prompt, 32000);
    const toolType = sanitizeText(req.body?.toolType || 'chat', 40);
    const requestedModel = resolveModel(req.body?.model);
    const chatIdInput = sanitizeText(req.body?.chatId, 80);
    const truncateFromIndex =
      req.body?.truncateFromIndex !== undefined && req.body?.truncateFromIndex !== ''
        ? parseInt(req.body.truncateFromIndex, 10)
        : null;
    const isRegenerate = req.body?.regenerate === 'true';

    let clientHistory = [];
    if (req.body?.history) {
      try {
        const parsed = JSON.parse(req.body.history);
        if (Array.isArray(parsed)) {
          clientHistory = parsed.slice(-20).map((m) => ({
            role: m.role === 'model' ? 'model' : 'user',
            content: sanitizeText(m.content, 16000)
          }));
        }
      } catch {
        return res.status(400).json({ error: 'Format riwayat percakapan tidak valid.' });
      }
    }

    const uploadedFiles = (req.files || []).map((f) => ({
      name: sanitizeText(f.originalname, 120),
      mimeType: normalizeGeminiMimeType(f),
      size: f.size,
      base64: f.buffer.toString('base64')
    }));

    if (!prompt && uploadedFiles.length === 0 && !isRegenerate) {
      return res.status(400).json({ error: 'Pesan atau file lampiran tidak boleh kosong.' });
    }

    setupSseHeaders(res);

    const abortController = new AbortController();
    req.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    try {
      let activeChatId = chatIdInput || null;
      let userSettings = { temperature: 0.7, custom_instruction: '' };

      if (req.user) {
        userSettings = await getUserSettings(req.user.id);

        if (!activeChatId && toolType === 'chat') {
          const autoTitle = (prompt || uploadedFiles[0]?.name || 'Percakapan Baru').slice(0, 60);
          const created = await createChat(req.user.id, {
            title: autoTitle,
            toolType,
            model: requestedModel
          });
          activeChatId = created.id;
        }

        if (activeChatId) {
          if (Number.isInteger(truncateFromIndex) && truncateFromIndex >= 0) {
            const kept = await replaceChatMessagesFromIndex(req.user.id, activeChatId, truncateFromIndex);
            clientHistory = kept.map((m) => ({ role: m.role, content: m.content }));
          } else {
            const existingChat = await getChatWithMessages(req.user.id, activeChatId);
            if (existingChat) {
              clientHistory = existingChat.messages.slice(-20).map((m) => ({
                role: m.role,
                content: m.content
              }));
            }
          }

          if (!isRegenerate && (prompt || uploadedFiles.length > 0)) {
            const userTextToSave =
              prompt || `[Melampirkan file: ${uploadedFiles.map((f) => f.name).join(', ')}]`;
            await appendMessage(req.user.id, activeChatId, {
              role: 'user',
              content: userTextToSave,
              attachmentsMeta: uploadedFiles.map((f) => ({
                name: f.name,
                mimeType: f.mimeType,
                size: f.size
              }))
            });
          }
        }
      }

      if (activeChatId) {
        sendSseEvent(res, 'meta', { chatId: activeChatId, model: requestedModel });
      }

      const effectivePrompt = isRegenerate
        ? ''
        : prompt || 'Analisis dan jelaskan file yang saya lampirkan secara lengkap.';

      const fullAssistantText = await streamGeminiResponse({
        model: requestedModel,
        history: clientHistory,
        prompt: effectivePrompt,
        files: uploadedFiles,
        toolInstruction: TOOL_SYSTEM_PROMPTS[toolType] || '',
        customInstruction: userSettings.custom_instruction || '',
        temperature: userSettings.temperature ?? 0.7,
        signal: abortController.signal,
        onChunk: (delta) => {
          sendSseEvent(res, 'chunk', { text: delta });
        }
      });

      let savedAssistantMsg = null;
      if (req.user && activeChatId) {
        savedAssistantMsg = await appendMessage(req.user.id, activeChatId, {
          role: 'model',
          content: fullAssistantText
        });
      }

      sendSseEvent(res, 'done', {
        chatId: activeChatId,
        messageId: savedAssistantMsg?.id || null,
        fullText: fullAssistantText
      });
      res.end();
    } catch (err) {
      if (err.name === 'AbortError') {
        if (!res.writableEnded) res.end();
        return;
      }
      sendSseEvent(res, 'error', {
        error: err.message || 'Terjadi kesalahan saat memproses respons AI.'
      });
      res.end();
    }
  }
);

module.exports = router;
