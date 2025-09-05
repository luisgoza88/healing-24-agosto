-- Actualizar tabla de profiles con campos adicionales
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allergies TEXT;

-- Crear tabla de preferencias de notificación
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  appointments_reminder BOOLEAN DEFAULT true,
  appointments_confirmation BOOLEAN DEFAULT true,
  promotions BOOLEAN DEFAULT true,
  hot_studio_updates BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24, -- Horas antes para recordatorio
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de dispositivos para push notifications
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  device_type VARCHAR(20) NOT NULL, -- 'ios', 'android'
  device_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- Crear índices
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_token ON user_devices(device_token);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver y actualizar sus propias preferencias
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden gestionar sus propios dispositivos
CREATE POLICY "Users can view own devices" ON user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- Función para crear preferencias por defecto cuando se crea un usuario
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear preferencias cuando se crea un perfil
CREATE TRIGGER create_notification_preferences_on_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();