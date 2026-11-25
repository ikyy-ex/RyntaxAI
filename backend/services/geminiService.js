const {
  GEMINI_API_KEY,
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  isGeminiConfigured
} = require('../config/env');

const BASE_SYSTEM_PROMPT = `Anda adalah RYNTAX AI ("Your Intelligence, Beyond Limits."), asisten kecerdasan buatan profesional yang cerdas, akurat, jujur, dan membantu.
Aturan utama:
1. Jawab pertanyaan dengan jelas, terstruktur, dan gunakan Markdown yang rapi (termasuk blok kode berlabel bahasa dan LaTeX $...$ / $$...$$ untuk rumus matematika).
2. Sesuaikan bahasa jawaban dengan bahasa pengguna (utamakan Bahasa Indonesia yang natural dan profesional jika pengguna berbahasa Indonesia).
3. Prioritaskan akurasi faktual. Jika Anda tidak yakin, data tidak tersedia, atau pertanyaan berada di luar pengetahuan Anda, nyatakan ketidakpastian tersebut secara jujur dan jangan pernah mengarang fakta.`;

function resolveModel(requestedModel) {
  const valid = AVAILABLE_MODELS.find((m) => m.id === requestedModel);
  return valid ? valid.id : DEFAULT_MODEL;
}

function mapGeminiHttpError(status, rawBody) {
  let apiMessage = '';
  try {
    const parsed = JSON.parse(rawBody);
    apiMessage = parsed?.error?.message || '';
  } catch {
    apiMessage = rawBody || '';
  }

  if (status === 400) {
    return `Permintaan ke Gemini API ditolak (400): ${apiMessage || 'Periksa format input, file lampiran, atau API Key Anda.'}`;
  }
  if (status === 401 || status === 403) {
    return `Akses Gemini API ditolak (${status}): Pastikan GEMINI_API_KEY valid dan Generative Language API aktif. ${apiMessage}`;
  }
  if (status === 404) {
    return `Model Gemini tidak ditemukan (404): ${apiMessage || 'Model yang dipilih tidak tersedia.'}`;
  }
  if (status === 429) {
    return `Batas penggunaan (Quota / Rate Limit) Gemini API tercapai (429). Silakan tunggu sebentar atau gunakan model Gemini 2.5 Flash-Lite.`;
  }
  if (status >= 500) {
    return `Server Google Gemini sedang mengalami gangguan sementara (${status}). Silakan coba lagi beberapa saat lagi.`;
  }
  return `Gagal terhubung ke Gemini API (HTTP ${status}): ${apiMessage || 'Kesalahan tidak diketahui.'}`;
}

function buildGeminiContents(history = [], currentPrompt = '', files = []) {
  const contents = [];

  for (const turn of history) {
    if (!turn || !turn.content) continue;
    const role = turn.role === 'model' ? 'model' : 'user';
    contents.push({
      role,
      parts: [{ text: String(turn.content) }]
    });
  }

  const currentParts = [];
  if (currentPrompt) {
    currentParts.push({ text: currentPrompt });
  }
  for (const file of files) {
    currentParts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.base64
      }
    });
  }

  if (currentParts.length > 0) {
    contents.push({
      role: 'user',
      parts: currentParts
    });
  }

  return contents;
}

async function streamGeminiResponse({
  model,
  history,
  prompt,
  files = [],
  toolInstruction = '',
  customInstruction = '',
  temperature = 0.7,
  signal,
  onChunk
}) {
  if (!isGeminiConfigured()) {
    const err = new Error('GEMINI_API_KEY belum dikonfigurasi pada server (.env).');
    err.code = 'API_NOT_CONFIGURED';
    throw err;
  }

  const targetModel = resolveModel(model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:streamGenerateContent?alt=sse`;

  const combinedSystemPrompt = [
    BASE_SYSTEM_PROMPT,
    toolInstruction ? `\nInstruksi Khusus Mode Aktif:\n${toolInstruction}` : '',
    customInstruction ? `\nPreferensi Pengguna:\n${customInstruction}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const payload = {
    systemInstruction: {
      parts: [{ text: combinedSystemPrompt }]
    },
    contents: buildGeminiContents(history, prompt, files),
    generationConfig: {
      temperature: Math.min(1.5, Math.max(0, Number(temperature) || 0.7)),
      maxOutputTokens: 8192
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(mapGeminiHttpError(response.status, errorBody));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const parts = parsed?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (typeof part.text === 'string' && part.text.length > 0) {
            fullText += part.text;
            if (onChunk) onChunk(part.text);
          }
        }
      } catch {
        // Abaikan potongan JSON SSE yang belum lengkap
      }
    }
  }

  if (!fullText.trim()) {
    throw new Error('Model AI tidak mengembalikan teks jawaban (kemungkinan terblokir filter keamanan konten).');
  }

  return fullText;
}

module.exports = {
  streamGeminiResponse,
  resolveModel
};

