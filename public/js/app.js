(function () {
  const state = {
    user: null,
    settings: {
      theme: 'dark',
      language: 'id',
      animations_enabled: true,
      font_size: 'normal',
      preferred_model: 'gemini-2.5-flash',
      temperature: 0.7,
      custom_instruction: ''
    },
    chats: [],
    activeChatId: null,
    messages: [],
    pendingFiles: [],
    isStreaming: false,
    abortController: null,
    activeTool: null,
    toolAbortController: null,
    lastToolOutput: '',
    authMode: 'login'
  };

  const els = {
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    brandHomeBtn: document.getElementById('brandHomeBtn'),
    navItems: document.querySelectorAll('.nav-item'),
    views: document.querySelectorAll('.view-section'),
    chatSearchInput: document.getElementById('chatSearchInput'),
    chatHistoryList: document.getElementById('chatHistoryList'),
    guestAccountCard: document.getElementById('guestAccountCard'),
    loggedInAccountCard: document.getElementById('loggedInAccountCard'),
    userAvatarInitial: document.getElementById('userAvatarInitial'),
    userDisplayName: document.getElementById('userDisplayName'),
    userDisplayEmail: document.getElementById('userDisplayEmail'),
    openAuthModalBtn: document.getElementById('openAuthModalBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    modelSelect: document.getElementById('modelSelect'),
    apiStatusDot: document.getElementById('apiStatusDot'),
    apiSetupBanner: document.getElementById('apiSetupBanner'),
    apiSetupText: document.getElementById('apiSetupText'),
    goSettingsSetupBtn: document.getElementById('goSettingsSetupBtn'),
    exportChatBtn: document.getElementById('exportChatBtn'),
    quickThemeBtn: document.getElementById('quickThemeBtn'),
    chatScrollContainer: document.getElementById('chatScrollContainer'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messagesList: document.getElementById('messagesList'),
    chatForm: document.getElementById('chatForm'),
    promptInput: document.getElementById('promptInput'),
    attachFileBtn: document.getElementById('attachFileBtn'),
    fileInput: document.getElementById('fileInput'),
    attachmentPreviewBar: document.getElementById('attachmentPreviewBar'),
    sendBtn: document.getElementById('sendBtn'),
    stopBtn: document.getElementById('stopBtn'),
    dropZoneOverlay: document.getElementById('dropZoneOverlay'),
    toolsSearchInput: document.getElementById('toolsSearchInput'),
    toolsGrid: document.getElementById('toolsGrid'),
    toolWorkspace: document.getElementById('toolWorkspace'),
    activeToolTitle: document.getElementById('activeToolTitle'),
    activeToolDesc: document.getElementById('activeToolDesc'),
    closeToolWorkspaceBtn: document.getElementById('closeToolWorkspaceBtn'),
    toolForm: document.getElementById('toolForm'),
    toolDynamicFields: document.getElementById('toolDynamicFields'),
    toolFileInput: document.getElementById('toolFileInput'),
    toolFileLabel: document.getElementById('toolFileLabel'),
    runToolBtn: document.getElementById('runToolBtn'),
    stopToolBtn: document.getElementById('stopToolBtn'),
    toolOutputContent: document.getElementById('toolOutputContent'),
    copyToolOutputBtn: document.getElementById('copyToolOutputBtn'),
    downloadToolOutputBtn: document.getElementById('downloadToolOutputBtn'),
    authModal: document.getElementById('authModal'),
    authModalTitle: document.getElementById('authModalTitle'),
    closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
    authTabs: document.querySelectorAll('.auth-tab'),
    authForm: document.getElementById('authForm'),
    authNameField: document.getElementById('authNameField'),
    authNameInput: document.getElementById('authNameInput'),
    authEmailInput: document.getElementById('authEmailInput'),
    authPasswordInput: document.getElementById('authPasswordInput'),
    authErrorMsg: document.getElementById('authErrorMsg'),
    authSubmitBtn: document.getElementById('authSubmitBtn'),
    toastContainer: document.getElementById('toastContainer')
  };

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function applySettingsToDom(settings) {
    state.settings = { ...state.settings, ...settings };
    document.documentElement.setAttribute('data-theme', state.settings.theme || 'dark');
    document.documentElement.setAttribute('data-font-size', state.settings.font_size || 'normal');
    document.body.classList.toggle('no-animations', state.settings.animations_enabled === false);

    if (state.settings.preferred_model) {
      els.modelSelect.value = state.settings.preferred_model;
    }

    document.getElementById('settingThemeSelect').value = state.settings.theme || 'dark';
    document.getElementById('settingLanguageSelect').value = state.settings.language || 'id';
    document.getElementById('settingFontSizeSelect').value = state.settings.font_size || 'normal';
    document.getElementById('settingAnimationsToggle').checked = state.settings.animations_enabled !== false;
    document.getElementById('settingModelSelect').value = state.settings.preferred_model || 'gemini-2.5-flash';
    document.getElementById('settingTempRange').value = state.settings.temperature ?? 0.7;
    document.getElementById('tempValueLabel').textContent = String(state.settings.temperature ?? 0.7);
    document.getElementById('settingCustomPrompt').value = state.settings.custom_instruction || '';
    document.getElementById('settingsActiveModel').textContent = els.modelSelect.value;
  }

  function switchView(viewName) {
    els.navItems.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    els.views.forEach((sec) => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });
    closeMobileSidebar();
  }

  function toggleSidebar() {
    if (window.innerWidth <= 820) {
      const opening = !els.sidebar.classList.contains('open');
      els.sidebar.classList.toggle('open', opening);
      els.sidebarBackdrop.classList.toggle('active', opening);
    } else {
      els.sidebar.classList.toggle('collapsed');
    }
  }

  function closeMobileSidebar() {
    els.sidebar.classList.remove('open');
    els.sidebarBackdrop.classList.remove('active');
  }

  async function refreshHealthStatus() {
    try {
      const health = await window.RyntaxApi.getHealth();
      const gemEl = document.getElementById('settingsGeminiStatus');
      const dbEl = document.getElementById('settingsDbStatus');
      const guideEl = document.getElementById('settingsSetupGuide');

      if (health.geminiConfigured) {
        els.apiStatusDot.className = 'status-dot status-ok';
        els.apiSetupBanner.classList.add('hidden');
        gemEl.textContent = 'Terkonfigurasi & Siap';
        gemEl.style.color = '#10b981';
        guideEl.classList.add('hidden');
      } else {
        els.apiStatusDot.className = 'status-dot status-err';
        els.apiSetupBanner.classList.remove('hidden');
        els.apiSetupText.textContent = health.setupHint;
        gemEl.textContent = 'Belum Dikonfigurasi (.env)';
        gemEl.style.color = '#f59e0b';
        guideEl.classList.remove('hidden');
      }

      dbEl.textContent = health.databaseMode || 'Aktif';
    } catch {
      els.apiStatusDot.className = 'status-dot status-err';
    }
  }

  async function initAuthAndData() {
    try {
      const me = await window.RyntaxApi.getMe();
      if (me.authenticated && me.user) {
        setAuthenticatedUser(me.user, me.settings);
        await loadUserChats();
      } else {
        setGuestUser();
      }
    } catch {
      setGuestUser();
    }
  }

  function setAuthenticatedUser(user, settings) {
    state.user = user;
    els.guestAccountCard.classList.add('hidden');
    els.loggedInAccountCard.classList.remove('hidden');
    els.userAvatarInitial.textContent = (user.name || 'U').charAt(0).toUpperCase();
    els.userDisplayName.textContent = user.name;
    els.userDisplayEmail.textContent = user.email;
    if (settings) applySettingsToDom(settings);
  }

  function setGuestUser() {
    state.user = null;
    state.chats = [];
    els.loggedInAccountCard.classList.add('hidden');
    els.guestAccountCard.classList.remove('hidden');
    renderChatHistory();
  }

  async function loadUserChats() {
    if (!state.user) return;
    els.chatHistoryList.innerHTML = '<div class="skeleton-line"></div><div class="skeleton-line"></div>';
    try {
      const res = await window.RyntaxApi.listChats();
      state.chats = res.chats || [];
      renderChatHistory();
    } catch (err) {
      els.chatHistoryList.innerHTML = '';
      showToast(err.message);
    }
  }

  function renderChatHistory() {
    const query = (els.chatSearchInput.value || '').toLowerCase().trim();
    const filtered = state.chats.filter((c) => c.title.toLowerCase().includes(query));

    if (!state.user) {
      els.chatHistoryList.innerHTML =
        '<p style="font-size:12px;color:var(--text-muted);padding:8px;">Masuk ke akun untuk menyimpan dan mengelola riwayat percakapan Anda.</p>';
      return;
    }

    if (filtered.length === 0) {
      els.chatHistoryList.innerHTML =
        '<p style="font-size:12px;color:var(--text-muted);padding:8px;">Belum ada percakapan tersimpan.</p>';
      return;
    }

    els.chatHistoryList.innerHTML = '';
    for (const chat of filtered) {
      const item = document.createElement('div');
      item.className = `history-item ${chat.id === state.activeChatId ? 'active' : ''}`;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'history-item-title';
      titleSpan.textContent = chat.title;
      titleSpan.addEventListener('click', () => openChat(chat.id));

      const actions = document.createElement('div');
      actions.className = 'history-item-actions';

      const renameBtn = document.createElement('button');
      renameBtn.className = 'history-mini-btn';
      renameBtn.title = 'Ganti Nama';
      renameBtn.textContent = '✎';
      renameBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const nextTitle = prompt('Ganti judul percakapan:', chat.title);
        if (nextTitle && nextTitle.trim()) {
          try {
            await window.RyntaxApi.renameChat(chat.id, nextTitle.trim());
            await loadUserChats();
            showToast('Judul percakapan diperbarui.');
          } catch (err) {
            showToast(err.message);
          }
        }
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'history-mini-btn del';
      delBtn.title = 'Hapus Percakapan';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Hapus percakapan "${chat.title}"?`)) return;
        try {
          await window.RyntaxApi.deleteChat(chat.id);
          if (state.activeChatId === chat.id) startNewChat();
          await loadUserChats();
          showToast('Percakapan dihapus.');
        } catch (err) {
          showToast(err.message);
        }
      });

      actions.appendChild(renameBtn);
      actions.appendChild(delBtn);
      item.appendChild(titleSpan);
      item.appendChild(actions);
      els.chatHistoryList.appendChild(item);
    }
  }

  async function openChat(chatId) {
    try {
      const res = await window.RyntaxApi.getChat(chatId);
      state.activeChatId = res.chat.id;
      state.messages = res.chat.messages || [];
      switchView('chat');
      renderChatHistory();
      renderAllMessages();
    } catch (err) {
      showToast(err.message);
    }
  }

  function startNewChat() {
    if (state.isStreaming) stopStreaming();
    state.activeChatId = null;
    state.messages = [];
    state.pendingFiles = [];
    renderAttachmentBar();
    renderChatHistory();
    renderAllMessages();
    switchView('chat');
    els.promptInput.focus();
  }

  function renderAllMessages() {
    if (state.messages.length === 0) {
      els.welcomeScreen.classList.remove('hidden');
      els.messagesList.classList.add('hidden');
      els.messagesList.innerHTML = '';
      return;
    }

    els.welcomeScreen.classList.add('hidden');
    els.messagesList.classList.remove('hidden');
    els.messagesList.innerHTML = '';

    state.messages.forEach((msg, index) => {
      appendMessageNode(msg, index);
    });
    scrollToBottom();
  }

  function appendMessageNode(msg, index) {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;
    row.dataset.index = String(index);

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (msg.attachments_meta && msg.attachments_meta.length > 0) {
      const attWrap = document.createElement('div');
      attWrap.className = 'msg-attachments';
      for (const att of msg.attachments_meta) {
        const chip = document.createElement('span');
        chip.className = 'attachment-chip';
        chip.textContent = `📎 ${att.name}`;
        attWrap.appendChild(chip);
      }
      bubble.appendChild(attWrap);
    }

    const contentDiv = document.createElement('div');
    if (msg.role === 'model') {
      contentDiv.className = 'markdown-body';
      if (msg.isLoading && !msg.content) {
        contentDiv.innerHTML = '<div class="ai-typing-indicator"><span></span><span></span><span></span></div>';
      } else {
        window.RyntaxRenderer.renderMarkdownSafe(contentDiv, msg.content);
      }
    } else {
      contentDiv.style.whiteSpace = 'pre-wrap';
      contentDiv.textContent = msg.content;
    }
    bubble.appendChild(contentDiv);
    row.appendChild(bubble);

    // Action buttons below message
    if (!msg.isLoading) {
      const actions = document.createElement('div');
      actions.className = 'msg-actions';

      if (msg.role === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'msg-action-btn';
        editBtn.textContent = 'Edit Pesan';
        editBtn.addEventListener('click', () => handleEditUserMessage(index));
        actions.appendChild(editBtn);
      } else {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'msg-action-btn';
        copyBtn.textContent = 'Salin';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(msg.content || '');
          copyBtn.textContent = 'Tersalin!';
          setTimeout(() => (copyBtn.textContent = 'Salin'), 1600);
        });
        actions.appendChild(copyBtn);

        if (index === state.messages.length - 1) {
          const regenBtn = document.createElement('button');
          regenBtn.className = 'msg-action-btn';
          regenBtn.textContent = 'Regenerate';
          regenBtn.addEventListener('click', () => handleRegenerate());
          actions.appendChild(regenBtn);
        }

        const likeBtn = document.createElement('button');
        likeBtn.className = `msg-action-btn ${msg.feedback === 'like' ? 'active' : ''}`;
        likeBtn.textContent = '👍';
        likeBtn.title = 'Suka';
        likeBtn.addEventListener('click', () => handleFeedback(index, 'like'));

        const dislikeBtn = document.createElement('button');
        dislikeBtn.className = `msg-action-btn ${msg.feedback === 'dislike' ? 'active' : ''}`;
        dislikeBtn.textContent = '👎';
        dislikeBtn.title = 'Kurang Tepat';
        dislikeBtn.addEventListener('click', () => handleFeedback(index, 'dislike'));

        actions.appendChild(likeBtn);
        actions.appendChild(dislikeBtn);
      }

      row.appendChild(actions);
    }

    els.messagesList.appendChild(row);
    return contentDiv;
  }

  function scrollToBottom() {
    els.chatScrollContainer.scrollTop = els.chatScrollContainer.scrollHeight;
  }

  function setStreamingUi(streaming) {
    state.isStreaming = streaming;
    els.sendBtn.classList.toggle('hidden', streaming);
    els.stopBtn.classList.toggle('hidden', !streaming);
    els.promptInput.disabled = streaming;
  }

  function stopStreaming() {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }
    setStreamingUi(false);
    const last = state.messages[state.messages.length - 1];
    if (last && last.isLoading) {
      last.isLoading = false;
      if (!last.content) last.content = '*[Generasi jawaban dihentikan oleh pengguna]*';
      renderAllMessages();
    }
  }

  async function sendChatMessage({
    promptText,
    filesToSend = [],
    truncateFromIndex = null,
    regenerate = false
  }) {
    if (state.isStreaming) return;

    if (truncateFromIndex !== null) {
      state.messages = state.messages.slice(0, truncateFromIndex);
    }

    if (!regenerate) {
      state.messages.push({
        role: 'user',
        content: promptText || `[Lampiran: ${filesToSend.map((f) => f.name).join(', ')}]`,
        attachments_meta: filesToSend.map((f) => ({ name: f.name, size: f.size }))
      });
    }

    const historySnapshot = state.messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content
    }));

    const assistantMsg = {
      id: null,
      role: 'model',
      content: '',
      feedback: null,
      isLoading: true
    };
    state.messages.push(assistantMsg);
    renderAllMessages();

    const contentEl = els.messagesList.lastElementChild?.querySelector('.markdown-body');
    setStreamingUi(true);
    state.abortController = new AbortController();

    try {
      await window.RyntaxApi.streamAiRequest({
        prompt: promptText,
        model: els.modelSelect.value,
        toolType: 'chat',
        chatId: state.activeChatId,
        history: historySnapshot,
        files: filesToSend,
        truncateFromIndex,
        regenerate,
        signal: state.abortController.signal,
        onMeta: (meta) => {
          if (meta.chatId && !state.activeChatId) {
            state.activeChatId = meta.chatId;
            loadUserChats();
          }
        },
        onChunk: (delta) => {
          assistantMsg.content += delta;
          if (contentEl) {
            window.RyntaxRenderer.renderMarkdownSafe(contentEl, assistantMsg.content);
            scrollToBottom();
          }
        },
        onDone: (doneData) => {
          assistantMsg.isLoading = false;
          assistantMsg.id = doneData.messageId || null;
          setStreamingUi(false);
          renderAllMessages();
          if (state.user) loadUserChats();
        }
      });
    } catch (err) {
      setStreamingUi(false);
      if (err.name === 'AbortError') return;
      assistantMsg.isLoading = false;
      assistantMsg.content = `**Gagal Memproses Permintaan AI:**\n\n${err.message}`;
      renderAllMessages();
      if (err.code === 'API_NOT_CONFIGURED') {
        refreshHealthStatus();
      }
    }
  }

  function handleEditUserMessage(index) {
    const target = state.messages[index];
    if (!target || target.role !== 'user') return;
    const edited = prompt('Edit pesan Anda:', target.content);
    if (edited === null || !edited.trim()) return;
    sendChatMessage({
      promptText: edited.trim(),
      truncateFromIndex: index
    });
  }

  function handleRegenerate() {
    if (state.messages.length < 2) return;
    const lastModelIdx = state.messages.length - 1;
    sendChatMessage({
      promptText: '',
      truncateFromIndex: lastModelIdx,
      regenerate: true
    });
  }

  async function handleFeedback(index, type) {
    const msg = state.messages[index];
    if (!msg) return;
    const nextVal = msg.feedback === type ? null : type;
    msg.feedback = nextVal;
    renderAllMessages();

    if (state.user && state.activeChatId && msg.id) {
      try {
        await window.RyntaxApi.sendFeedback(state.activeChatId, msg.id, nextVal);
      } catch {
        // Ignore network blip for feedback
      }
    }
  }

  // Attachments handling
  function addPendingFiles(fileList) {
    const incoming = Array.from(fileList || []);
    for (const file of incoming) {
      if (file.size > 8 * 1024 * 1024) {
        showToast(`File "${file.name}" melebihi batas maksimal 8 MB.`);
        continue;
      }
      if (state.pendingFiles.length >= 3) {
        showToast('Maksimal 3 file lampiran per pesan.');
        break;
      }
      state.pendingFiles.push(file);
    }
    renderAttachmentBar();
  }

  function renderAttachmentBar() {
    if (state.pendingFiles.length === 0) {
      els.attachmentPreviewBar.classList.add('hidden');
      els.attachmentPreviewBar.innerHTML = '';
      return;
    }
    els.attachmentPreviewBar.classList.remove('hidden');
    els.attachmentPreviewBar.innerHTML = '';
    state.pendingFiles.forEach((file, idx) => {
      const chip = document.createElement('div');
      chip.className = 'preview-chip';
      chip.innerHTML = `<span>📄 ${window.RyntaxRenderer.escapeHtml(file.name)}</span>`;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        state.pendingFiles.splice(idx, 1);
        renderAttachmentBar();
      });
      chip.appendChild(rm);
      els.attachmentPreviewBar.appendChild(chip);
    });
  }

  // Export Conversation
  function exportCurrentChat() {
    if (state.messages.length === 0) {
      showToast('Belum ada isi percakapan untuk diunduh.');
      return;
    }
    const lines = ['# RYNTAX AI — Ekspor Percakapan\n'];
    for (const m of state.messages) {
      lines.push(`## ${m.role === 'user' ? 'Pengguna' : 'RYNTAX AI'}\n\n${m.content}\n\n---\n`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ryntax-ai-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Percakapan berhasil diunduh (.md).');
  }

  // --- 12 AI TOOLS RENDERING & EXECUTION ---
  function renderToolsGrid() {
    const query = (els.toolsSearchInput.value || '').toLowerCase().trim();
    const list = window.RYNTAX_TOOLS.filter(
      (t) => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
    );

    els.toolsGrid.innerHTML = '';
    for (const tool of list) {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.innerHTML = `
        <div class="tool-icon-box">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2">${tool.icon}</svg>
        </div>
        <h3>${tool.title}</h3>
        <p>${tool.description}</p>
      `;
      card.addEventListener('click', () => openToolWorkspace(tool));
      els.toolsGrid.appendChild(card);
    }
  }

  function openToolWorkspace(tool) {
    state.activeTool = tool;
    els.toolsGrid.classList.add('hidden');
    els.toolWorkspace.classList.remove('hidden');
    els.activeToolTitle.textContent = tool.title;
    els.activeToolDesc.textContent = tool.description;
    els.toolFileInput.value = '';
    els.toolFileLabel.textContent = tool.requireFileHint
      ? 'Unggah Gambar / Dokumen Utama (Maks. 8 MB)'
      : 'Lampirkan Gambar / Dokumen (Opsional, Maks. 8 MB)';

    els.toolDynamicFields.innerHTML = '';
    for (const field of tool.fields) {
      const group = document.createElement('div');
      group.className = 'tool-field-group';
      const label = document.createElement('label');
      label.textContent = field.label;
      group.appendChild(label);

      if (field.type === 'select') {
        const sel = document.createElement('select');
        sel.name = field.name;
        sel.className = 'input-select';
        for (const opt of field.options) {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          sel.appendChild(o);
        }
        group.appendChild(sel);
      } else {
        const ta = document.createElement('textarea');
        ta.name = field.name;
        ta.className = 'input-textarea';
        ta.rows = 4;
        ta.placeholder = field.placeholder || '';
        if (field.required) ta.required = true;
        group.appendChild(ta);
      }
      els.toolDynamicFields.appendChild(group);
    }

    state.lastToolOutput = '';
    els.toolOutputContent.innerHTML =
      '<p class="muted-placeholder">Hasil AI akan muncul secara real-time di sini setelah Anda menjalankan tool.</p>';
  }

  function closeToolWorkspace() {
    if (state.toolAbortController) {
      state.toolAbortController.abort();
      state.toolAbortController = null;
    }
    state.activeTool = null;
    els.toolWorkspace.classList.add('hidden');
    els.toolsGrid.classList.remove('hidden');
  }

  async function runActiveTool(e) {
    e.preventDefault();
    if (!state.activeTool) return;

    const formData = new FormData(els.toolForm);
    const values = {};
    for (const [k, v] of formData.entries()) {
      values[k] = String(v);
    }

    const builtPrompt = state.activeTool.buildPrompt(values);
    const files = Array.from(els.toolFileInput.files || []);

    state.lastToolOutput = '';
    els.toolOutputContent.innerHTML = '<div class="ai-typing-indicator"><span></span><span></span><span></span></div>';
    els.runToolBtn.disabled = true;
    els.stopToolBtn.classList.remove('hidden');
    state.toolAbortController = new AbortController();

    try {
      await window.RyntaxApi.streamAiRequest({
        prompt: builtPrompt,
        model: els.modelSelect.value,
        toolType: state.activeTool.id,
        files,
        signal: state.toolAbortController.signal,
        onChunk: (delta) => {
          state.lastToolOutput += delta;
          window.RyntaxRenderer.renderMarkdownSafe(els.toolOutputContent, state.lastToolOutput);
        },
        onDone: () => {
          els.runToolBtn.disabled = false;
          els.stopToolBtn.classList.add('hidden');
        }
      });
    } catch (err) {
      els.runToolBtn.disabled = false;
      els.stopToolBtn.classList.add('hidden');
      if (err.name !== 'AbortError') {
        els.toolOutputContent.innerHTML = `<div class="error-box">${window.RyntaxRenderer.escapeHtml(err.message)}</div>`;
      }
    }
  }

  // --- EVENT LISTENERS ---
  els.toggleSidebarBtn.addEventListener('click', toggleSidebar);
  els.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  els.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  els.newChatBtn.addEventListener('click', startNewChat);
  els.brandHomeBtn.addEventListener('click', startNewChat);

  els.navItems.forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  els.chatSearchInput.addEventListener('input', renderChatHistory);
  els.toolsSearchInput.addEventListener('input', renderToolsGrid);

  document.querySelectorAll('.starter-card').forEach((card) => {
    card.addEventListener('click', () => {
      sendChatMessage({ promptText: card.dataset.prompt });
    });
  });

  els.promptInput.addEventListener('input', () => {
    els.promptInput.style.height = 'auto';
    els.promptInput.style.height = `${Math.min(els.promptInput.scrollHeight, 160)}px`;
  });

  els.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      els.chatForm.requestSubmit();
    }
  });

  els.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = els.promptInput.value.trim();
    if (!text && state.pendingFiles.length === 0) return;
    const filesToSend = [...state.pendingFiles];
    els.promptInput.value = '';
    els.promptInput.style.height = 'auto';
    state.pendingFiles = [];
    renderAttachmentBar();
    sendChatMessage({ promptText: text, filesToSend });
  });

  els.stopBtn.addEventListener('click', stopStreaming);
  els.attachFileBtn.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', (e) => {
    addPendingFiles(e.target.files);
    els.fileInput.value = '';
  });

  // Drag and Drop
  const chatView = document.getElementById('view-chat');
  chatView.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropZoneOverlay.classList.add('active');
  });
  els.dropZoneOverlay.addEventListener('dragleave', () => {
    els.dropZoneOverlay.classList.remove('active');
  });
  els.dropZoneOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropZoneOverlay.classList.remove('active');
    if (e.dataTransfer?.files?.length) {
      addPendingFiles(e.dataTransfer.files);
    }
  });

  els.exportChatBtn.addEventListener('click', exportCurrentChat);
  els.goSettingsSetupBtn.addEventListener('click', () => switchView('settings'));

  els.quickThemeBtn.addEventListener('click', () => {
    const next = state.settings.theme === 'dark' ? 'light' : 'dark';
    applySettingsToDom({ theme: next });
    if (state.user) window.RyntaxApi.updateSettings({ theme: next }).catch(() => {});
  });

  els.modelSelect.addEventListener('change', () => {
    document.getElementById('settingsActiveModel').textContent = els.modelSelect.value;
  });

  // Tools Listeners
  els.closeToolWorkspaceBtn.addEventListener('click', closeToolWorkspace);
  els.toolForm.addEventListener('submit', runActiveTool);
  els.stopToolBtn.addEventListener('click', () => {
    if (state.toolAbortController) state.toolAbortController.abort();
  });
  els.toolFileInput.addEventListener('change', () => {
    const f = els.toolFileInput.files?.[0];
    els.toolFileLabel.textContent = f ? `Terpilih: ${f.name}` : 'Lampirkan Gambar / Dokumen (Opsional)';
  });
  els.copyToolOutputBtn.addEventListener('click', () => {
    if (!state.lastToolOutput) return;
    navigator.clipboard.writeText(state.lastToolOutput);
    showToast('Hasil tool disalin ke clipboard.');
  });
  els.downloadToolOutputBtn.addEventListener('click', () => {
    if (!state.lastToolOutput) return;
    const blob = new Blob([state.lastToolOutput], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ryntax-tool-${state.activeTool?.id || 'output'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Settings Listeners
  document.getElementById('settingTempRange').addEventListener('input', (e) => {
    document.getElementById('tempValueLabel').textContent = e.target.value;
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    const nextSettings = {
      theme: document.getElementById('settingThemeSelect').value,
      language: document.getElementById('settingLanguageSelect').value,
      font_size: document.getElementById('settingFontSizeSelect').value,
      animations_enabled: document.getElementById('settingAnimationsToggle').checked,
      preferred_model: document.getElementById('settingModelSelect').value,
      temperature: parseFloat(document.getElementById('settingTempRange').value),
      custom_instruction: document.getElementById('settingCustomPrompt').value
    };
    applySettingsToDom(nextSettings);

    if (state.user) {
      try {
        await window.RyntaxApi.updateSettings(nextSettings);
        showToast('Pengaturan disimpan ke akun Anda.');
      } catch (err) {
        showToast(err.message);
      }
    } else {
      showToast('Pengaturan diterapkan pada sesi ini.');
    }
  });

  document.getElementById('testConnectionBtn').addEventListener('click', async () => {
    await refreshHealthStatus();
    showToast('Status koneksi API & database diperbarui.');
  });

  document.getElementById('clearAllChatsBtn').addEventListener('click', async () => {
    if (!state.user) {
      startNewChat();
      showToast('Sesi chat dibersihkan.');
      return;
    }
    if (!confirm('Hapus SELURUH riwayat percakapan permanen dari akun Anda?')) return;
    try {
      await window.RyntaxApi.clearAllChats();
      startNewChat();
      await loadUserChats();
      showToast('Seluruh riwayat percakapan berhasil dihapus.');
    } catch (err) {
      showToast(err.message);
    }
  });

  // Auth Modal Listeners
  els.openAuthModalBtn.addEventListener('click', () => {
    els.authErrorMsg.classList.add('hidden');
    els.authModal.classList.remove('hidden');
  });
  els.closeAuthModalBtn.addEventListener('click', () => els.authModal.classList.add('hidden'));

  els.authTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      state.authMode = tab.dataset.authMode;
      els.authTabs.forEach((t) => t.classList.toggle('active', t === tab));
      const isReg = state.authMode === 'register';
      els.authNameField.classList.toggle('hidden', !isReg);
      els.authModalTitle.textContent = isReg ? 'Daftar Akun RYNTAX AI' : 'Masuk ke RYNTAX AI';
      els.authSubmitBtn.textContent = isReg ? 'Buat Akun' : 'Masuk Sekarang';
      els.authErrorMsg.classList.add('hidden');
    });
  });

  els.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.authErrorMsg.classList.add('hidden');
    const email = els.authEmailInput.value.trim();
    const password = els.authPasswordInput.value;
    const name = els.authNameInput.value.trim();

    try {
      const res =
        state.authMode === 'register'
          ? await window.RyntaxApi.register(name, email, password)
          : await window.RyntaxApi.login(email, password);

      setAuthenticatedUser(res.user, res.settings);
      els.authModal.classList.add('hidden');
      els.authForm.reset();
      await loadUserChats();
      showToast(`Selamat datang, ${res.user.name}!`);
    } catch (err) {
      els.authErrorMsg.textContent = err.message;
      els.authErrorMsg.classList.remove('hidden');
    }
  });

  els.logoutBtn.addEventListener('click', async () => {
    await window.RyntaxApi.logout().catch(() => {});
    setGuestUser();
    startNewChat();
    showToast('Anda telah keluar dari akun.');
  });

  // Bootstrap Application
  renderToolsGrid();
  refreshHealthStatus();
  initAuthAndData();
})();
