-- Primero, eliminamos la tabla existente si tiene estructura incorrecta
DROP TABLE IF EXISTS appointments CASCADE;

-- Crear la tabla appointments con la estructura correcta
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id VARCHAR(255) NOT NULL,
  professional_id VARCHAR(255) NOT NULL,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

-- Habilitar RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Los usuarios pueden ver sus propias citas
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias citas
CREATE POLICY "Users can create own appointments" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias citas
CREATE POLICY "Users can update own appointments" ON appointments
  FOR UPDATE USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias citas
CREATE POLICY "Users can delete own appointments" ON appointments
  FOR DELETE USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();