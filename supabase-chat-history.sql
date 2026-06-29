-- AI 对话历史：会话 + 消息（SQL Editor → Create a new snippet → Run）
-- 见 docs/supabase-sql-editor-only.md

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '新对话',
  mode TEXT NOT NULL DEFAULT 'chat' CHECK (mode IN ('chat', 'image', 'video')),
  model_id TEXT NOT NULL,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
  ON public.chat_sessions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  media_json JSONB,
  is_error BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_order
  ON public.chat_messages(session_id, sort_order ASC);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_chat_sessions" ON public.chat_sessions;
CREATE POLICY "users_select_own_chat_sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_chat_sessions" ON public.chat_sessions;
CREATE POLICY "users_insert_own_chat_sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_chat_sessions" ON public.chat_sessions;
CREATE POLICY "users_update_own_chat_sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_chat_sessions" ON public.chat_sessions;
CREATE POLICY "users_delete_own_chat_sessions"
  ON public.chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_select_own_chat_messages" ON public.chat_messages;
CREATE POLICY "users_select_own_chat_messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_insert_own_chat_messages" ON public.chat_messages;
CREATE POLICY "users_insert_own_chat_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_delete_own_chat_messages" ON public.chat_messages;
CREATE POLICY "users_delete_own_chat_messages"
  ON public.chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );
