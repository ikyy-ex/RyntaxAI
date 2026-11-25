const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  isSupabaseConfigured,
  DEFAULT_MODEL
} = require('../config/env');

let supabase = null;
if (isSupabaseConfigured()) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'ryntax-store.json');

function ensureLocalStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { users: [], chats: [], messages: [], user_settings: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function readLocalStore() {
  ensureLocalStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { users: [], chats: [], messages: [], user_settings: [] };
  }
}

function writeLocalStore(data) {
  ensureLocalStore();
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

const DEFAULT_SETTINGS = {
  theme: 'dark',
  language: 'id',
  animations_enabled: true,
  font_size: 'normal',
  preferred_model: DEFAULT_MODEL,
  temperature: 0.7,
  custom_instruction: ''
};

// --- USER OPERATIONS ---
async function findUserByEmail(email) {
  const normalized = email.toLowerCase().trim();
  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalized)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
  const db = readLocalStore();
  return db.users.find((u) => u.email === normalized) || null;
}

async function createUser({ name, email, passwordHash }) {
  const normalized = email.toLowerCase().trim();
  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .insert({ name, email: normalized, password_hash: passwordHash })
      .select('id, name, email, created_at')
      .single();
    if (error) throw new Error(error.message);
    await supabase.from('user_settings').insert({ user_id: data.id, ...DEFAULT_SETTINGS });
    return data;
  }

  const db = readLocalStore();
  const user = {
    id: uuidv4(),
    name,
    email: normalized,
    password_hash: passwordHash,
    created_at: new Date().toISOString()
  };
  db.users.push(user);
  db.user_settings.push({
    user_id: user.id,
    ...DEFAULT_SETTINGS,
    updated_at: new Date().toISOString()
  });
  writeLocalStore(db);
  return { id: user.id, name: user.name, email: user.email, created_at: user.created_at };
}

// --- SETTINGS OPERATIONS ---
async function getUserSettings(userId) {
  if (supabase) {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data ? { ...DEFAULT_SETTINGS, ...data } : { ...DEFAULT_SETTINGS };
  }
  const db = readLocalStore();
  const found = db.user_settings.find((s) => s.user_id === userId);
  return found ? { ...DEFAULT_SETTINGS, ...found } : { ...DEFAULT_SETTINGS };
}

async function updateUserSettings(userId, patch) {
  const allowed = {};
  if (['dark', 'light'].includes(patch.theme)) allowed.theme = patch.theme;
  if (['id', 'en'].includes(patch.language)) allowed.language = patch.language;
  if (typeof patch.animations_enabled === 'boolean') allowed.animations_enabled = patch.animations_enabled;
  if (['small', 'normal', 'large'].includes(patch.font_size)) allowed.font_size = patch.font_size;
  if (typeof patch.preferred_model === 'string') allowed.preferred_model = patch.preferred_model;
  if (typeof patch.temperature === 'number' && patch.temperature >= 0 && patch.temperature <= 1.5) {
    allowed.temperature = patch.temperature;
  }
  if (typeof patch.custom_instruction === 'string') {
    allowed.custom_instruction = patch.custom_instruction.slice(0, 2000);
  }
  allowed.updated_at = new Date().toISOString();

  if (supabase) {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...allowed })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return { ...DEFAULT_SETTINGS, ...data };
  }

  const db = readLocalStore();
  const idx = db.user_settings.findIndex((s) => s.user_id === userId);
  if (idx >= 0) {
    db.user_settings[idx] = { ...db.user_settings[idx], ...allowed };
  } else {
    db.user_settings.push({ user_id: userId, ...DEFAULT_SETTINGS, ...allowed });
  }
  writeLocalStore(db);
  return getUserSettings(userId);
}

// --- CHAT & MESSAGE OPERATIONS ---
async function listUserChats(userId) {
  if (supabase) {
    const { data, error } = await supabase
      .from('chats')
      .select('id, title, tool_type, model, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  const db = readLocalStore();
  return db.chats
    .filter((c) => c.user_id === userId)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

async function createChat(userId, { title = 'Percakapan Baru', toolType = 'chat', model = DEFAULT_MODEL } = {}) {
  if (supabase) {
    const { data, error } = await supabase
      .from('chats')
      .insert({ user_id: userId, title: title.slice(0, 180), tool_type: toolType, model })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const db = readLocalStore();
  const now = new Date().toISOString();
  const chat = {
    id: uuidv4(),
    user_id: userId,
    title: title.slice(0, 180),
    tool_type: toolType,
    model,
    created_at: now,
    updated_at: now
  };
  db.chats.push(chat);
  writeLocalStore(db);
  return chat;
}

async function getChatWithMessages(userId, chatId) {
  if (supabase) {
    const { data: chat, error: chatErr } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .maybeSingle();
    if (chatErr) throw new Error(chatErr.message);
    if (!chat) return null;

    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (msgErr) throw new Error(msgErr.message);

    return { ...chat, messages: messages || [] };
  }

  const db = readLocalStore();
  const chat = db.chats.find((c) => c.id === chatId && c.user_id === userId);
  if (!chat) return null;
  const messages = db.messages
    .filter((m) => m.chat_id === chatId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return { ...chat, messages };
}

async function renameChat(userId, chatId, title) {
  const cleanTitle = title.trim().slice(0, 180);
  if (!cleanTitle) throw new Error('Judul percakapan tidak boleh kosong.');

  if (supabase) {
    const { data, error } = await supabase
      .from('chats')
      .update({ title: cleanTitle, updated_at: new Date().toISOString() })
      .eq('id', chatId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  const db = readLocalStore();
  const chat = db.chats.find((c) => c.id === chatId && c.user_id === userId);
  if (!chat) return null;
  chat.title = cleanTitle;
  chat.updated_at = new Date().toISOString();
  writeLocalStore(db);
  return chat;
}

async function deleteChat(userId, chatId) {
  if (supabase) {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalStore();
  const exists = db.chats.some((c) => c.id === chatId && c.user_id === userId);
  if (!exists) return false;
  db.chats = db.chats.filter((c) => !(c.id === chatId && c.user_id === userId));
  db.messages = db.messages.filter((m) => m.chat_id !== chatId);
  writeLocalStore(db);
  return true;
}

async function deleteAllUserChats(userId) {
  if (supabase) {
    const { error } = await supabase.from('chats').delete().eq('user_id', userId);
    if (error) throw new Error(error.message);
    return true;
  }
  const db = readLocalStore();
  const chatIds = new Set(db.chats.filter((c) => c.user_id === userId).map((c) => c.id));
  db.chats = db.chats.filter((c) => c.user_id !== userId);
  db.messages = db.messages.filter((m) => !chatIds.has(m.chat_id));
  writeLocalStore(db);
  return true;
}

async function appendMessage(userId, chatId, { role, content, attachmentsMeta = [] }) {
  if (supabase) {
    const { data: chat } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!chat) throw new Error('Percakapan tidak ditemukan atau akses ditolak.');

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        role,
        content,
        attachments_meta: attachmentsMeta
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    return msg;
  }

  const db = readLocalStore();
  const chat = db.chats.find((c) => c.id === chatId && c.user_id === userId);
  if (!chat) throw new Error('Percakapan tidak ditemukan atau akses ditolak.');

  const msg = {
    id: uuidv4(),
    chat_id: chatId,
    role,
    content,
    attachments_meta: attachmentsMeta,
    feedback: null,
    created_at: new Date().toISOString()
  };
  db.messages.push(msg);
  chat.updated_at = msg.created_at;
  writeLocalStore(db);
  return msg;
}

async function setMessageFeedback(userId, chatId, messageId, feedback) {
  const validFeedback = ['like', 'dislike', null].includes(feedback) ? feedback : null;
  if (supabase) {
    const { data: chat } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!chat) return null;

    const { data, error } = await supabase
      .from('messages')
      .update({ feedback: validFeedback })
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  const db = readLocalStore();
  const chat = db.chats.find((c) => c.id === chatId && c.user_id === userId);
  if (!chat) return null;
  const msg = db.messages.find((m) => m.id === messageId && m.chat_id === chatId);
  if (!msg) return null;
  msg.feedback = validFeedback;
  writeLocalStore(db);
  return msg;
}

async function replaceChatMessagesFromIndex(userId, chatId, keepCount) {
  const full = await getChatWithMessages(userId, chatId);
  if (!full) throw new Error('Percakapan tidak ditemukan.');
  const kept = full.messages.slice(0, Math.max(0, keepCount));

  if (supabase) {
    const keptIds = new Set(kept.map((m) => m.id));
    const toDelete = full.messages.filter((m) => !keptIds.has(m.id)).map((m) => m.id);
    if (toDelete.length > 0) {
      await supabase.from('messages').delete().in('id', toDelete);
    }
    return kept;
  }

  const db = readLocalStore();
  const keptIds = new Set(kept.map((m) => m.id));
  db.messages = db.messages.filter((m) => m.chat_id !== chatId || keptIds.has(m.id));
  writeLocalStore(db);
  return kept;
}

module.exports = {
  findUserByEmail,
  createUser,
  getUserSettings,
  updateUserSettings,
  listUserChats,
  createChat,
  getChatWithMessages,
  renameChat,
  deleteChat,
  deleteAllUserChats,
  appendMessage,
  setMessageFeedback,
  replaceChatMessagesFromIndex
};
