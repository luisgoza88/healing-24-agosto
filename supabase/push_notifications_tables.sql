-- Tabla para almacenar tokens de notificaciones push
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, token)
);

-- Tabla para el historial de notificaciones enviadas
CREATE TABLE IF NOT EXISTS notification_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  type text NOT NULL CHECK (type IN ('appointment_reminder', 'class_reminder', 'class_available', 'payment_success', 'general')),
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_read ON notification_history(read_at);

-- RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Políticas para push_tokens
CREATE POLICY "Users can view own push tokens" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para notification_history
CREATE POLICY "Users can view own notifications" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notification_history
  FOR UPDATE USING (auth.uid() = user_id);