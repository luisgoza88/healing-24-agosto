-- Primero, eliminar servicios que no deberían existir
DELETE FROM services WHERE name IN ('Acupuntura', 'Fisioterapia', 'Homeopatía', 'Terapias Alternativas');

-- Actualizar o insertar los servicios correctos
INSERT INTO services (id, name, description, default_duration, base_price, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Medicina Funcional', 'Consultas especializadas y péptidos', 60, 200000, NOW(), NOW()),
  (gen_random_uuid(), 'Medicina Estética', 'Procedimientos estéticos avanzados', 60, 750000, NOW(), NOW()),
  (gen_random_uuid(), 'Medicina Regenerativa & Longevidad', 'Terapias antiedad y bienestar', 60, 180000, NOW(), NOW()),
  (gen_random_uuid(), 'DRIPS - Sueroterapia', 'Terapias intravenosas y sueroterapia', 60, 265000, NOW(), NOW()),
  (gen_random_uuid(), 'Faciales', 'Tratamientos faciales especializados', 90, 380000, NOW(), NOW()),
  (gen_random_uuid(), 'Masajes', 'Masajes terapéuticos y relajantes', 75, 200000, NOW(), NOW()),
  (gen_random_uuid(), 'Wellness Integral', 'Servicios de bienestar integral', 60, 200000, NOW(), NOW()),
  (gen_random_uuid(), 'Breathe & Move', 'Clases de movimiento y respiración consciente', 60, 50000, NOW(), NOW())
ON CONFLICT (name) DO UPDATE
SET 
  description = EXCLUDED.description,
  updated_at = NOW();

-- Crear tabla para sub-servicios si no existe
CREATE TABLE IF NOT EXISTS service_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL, -- en minutos
  price DECIMAL(10,2) NOT NULL,
  price_note TEXT, -- para indicar "desde" u otra nota
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_service_items_service_id ON service_items(service_id);
CREATE INDEX IF NOT EXISTS idx_service_items_active ON service_items(active);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_service_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_items_updated_at
BEFORE UPDATE ON service_items
FOR EACH ROW
EXECUTE FUNCTION update_service_items_updated_at();

-- RLS para service_items
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública
CREATE POLICY "Service items are viewable by everyone" ON service_items
  FOR SELECT USING (true);

-- Política para modificación solo por admins
CREATE POLICY "Service items are editable by admins" ON service_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );