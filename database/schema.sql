-- Aktifkan ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabel Akun Pengguna
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Percakapan (Chats)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'Percakapan Baru',
  tool_type VARCHAR(50) NOT NULL DEFAULT 'chat',
  model VARCHAR(80) NOT NULL DEFAULT 'gemini-2.5-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id, updated_at DESC);

-- 3. Tabel Pesan (Messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  attachments_meta JSONB DEFAULT '[]'::jsonb,
  feedback VARCHAR(10) DEFAULT NULL CHECK (feedback IN ('like', 'dislike', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id, created_at ASC);

-- 4. Tabel Pengaturan Pengguna
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme VARCHAR(10) NOT NULL DEFAULT 'dark',
  language VARCHAR(10) NOT NULL DEFAULT 'id',
  animations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  font_size VARCHAR(15) NOT NULL DEFAULT 'normal',
  preferred_model VARCHAR(80) NOT NULL DEFAULT 'gemini-2.5-flash',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  custom_instruction TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses berbasis pemilik akun
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users manage own chats" ON public.chats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own messages" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);
