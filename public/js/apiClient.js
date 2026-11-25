(function () {
  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)ryntax_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  async function requestJson(url, options = {}) {
    const headers = Object.assign(
      {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken()
      },
      options.headers || {}
    );

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin'
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || `HTTP Error ${response.status}`);
      err.code = data.code;
      throw err;
    }
    return data;
  }

  async function streamAiRequest({
    prompt,
    model,
    toolType = 'chat',
    chatId = null,
    history = [],
    files = [],
    truncateFromIndex = null,
    regenerate = false,
    signal,
    onMeta,
    onChunk,
    onDone
  }) {
    const formData = new FormData();
    formData.append('prompt', prompt || '');
    formData.append('model', model || 'gemini-2.5-flash');
    formData.append('toolType', toolType);
    if (chatId) formData.append('chatId', chatId);
    if (history && history.length > 0) {
      formData.append('history', JSON.stringify(history));
    }
    if (truncateFromIndex !== null && truncateFromIndex !== undefined) {
      formData.append('truncateFromIndex', String(truncateFromIndex));
    }
    if (regenerate) {
      formData.append('regenerate', 'true');
    }
    for (const file of files) {
      formData.append('files', file);
    }

    const response = await fetch('/api/ai/stream', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': getCsrfToken()
      },
      body: formData,
      credentials: 'same-origin',
      signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const err = new Error(errData.error || `Gagal menghubungi AI (HTTP ${response.status}).`);
      err.code = errData.code;
      throw err;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let currentEvent = 'message';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const rawJson = line.slice(5).trim();
          if (!rawJson) continue;
          const payload = JSON.parse(rawJson);

          if (currentEvent === 'meta' && onMeta) {
            onMeta(payload);
          } else if (currentEvent === 'chunk' && onChunk) {
            onChunk(payload.text || '');
          } else if (currentEvent === 'done' && onDone) {
            onDone(payload);
          } else if (currentEvent === 'error') {
            throw new Error(payload.error || 'Terjadi kesalahan streaming AI.');
          }
        }
      }
    }
  }

  window.RyntaxApi = {
    getHealth: () => requestJson('/api/health'),
    getMe: () => requestJson('/api/auth/me'),
    login: (email, password) =>
      requestJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    register: (name, email, password) =>
      requestJson('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      }),
    logout: () => requestJson('/api/auth/logout', { method: 'POST' }),
    updateSettings: (settings) =>
      requestJson('/api/auth/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings)
      }),
    listChats: () => requestJson('/api/chats'),
    createChat: (payload) =>
      requestJson('/api/chats', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    getChat: (id) => requestJson(`/api/chats/${encodeURIComponent(id)}`),
    renameChat: (id, title) =>
      requestJson(`/api/chats/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ title })
      }),
    deleteChat: (id) =>
      requestJson(`/api/chats/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }),
    clearAllChats: () =>
      requestJson('/api/chats/all/clear', {
        method: 'DELETE'
      }),
    sendFeedback: (chatId, messageId, feedback) =>
      requestJson(`/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ feedback })
      }),
    streamAiRequest
  };
})();
