-- PASO 1: VERSIÓN CORREGIDA - EJECUTAR EN SUPABASE SQL EDITOR

-- Tabla para almacenar tokens de push notifications
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, token)
);

-- Tabla para historial de notificaciones
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  category TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Habilitar RLS (solo si no está habilitado)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'push_tokens' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'notification_history' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notification_history;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notification_history;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notification_history;

-- Crear políticas de seguridad
CREATE POLICY "Users can view their own push tokens" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notifications" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications" ON notification_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notification_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Crear índices solo si no existen
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_read ON notification_history(read_at);

-- Agregar columnas para rastrear notificaciones enviadas
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS notification_24h_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_2h_sent TIMESTAMP WITH TIME ZONE;

-- Crear índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_notification_24h 
ON appointments(appointment_date, status, notification_24h_sent);

CREATE INDEX IF NOT EXISTS idx_appointments_notification_2h 
ON appointments(appointment_date, status, notification_2h_sent);

-- Crear índice para clases
CREATE INDEX IF NOT EXISTS idx_classes_start_time 
ON classes(start_time);

-- Crear índice para lista de espera
CREATE INDEX IF NOT EXISTS idx_class_waitlist_position 
ON class_waitlist(class_id, position);