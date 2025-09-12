-- Drop existing RLS policies temporarily
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- Delete ALL existing services
DELETE FROM services;

-- Insert ONLY the correct 8 services
INSERT INTO services (id, name, description, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Medicina Funcional', 'Consultas especializadas y péptidos', NOW(), NOW()),
  (gen_random_uuid(), 'Medicina Estética', 'Procedimientos estéticos avanzados', NOW(), NOW()),
  (gen_random_uuid(), 'Medicina Regenerativa & Longevidad', 'Terapias antiedad y bienestar', NOW(), NOW()),
  (gen_random_uuid(), 'DRIPS - Sueroterapia', 'Terapias intravenosas y sueroterapia', NOW(), NOW()),
  (gen_random_uuid(), 'Faciales', 'Tratamientos faciales especializados', NOW(), NOW()),
  (gen_random_uuid(), 'Masajes', 'Masajes terapéuticos y relajantes', NOW(), NOW()),
  (gen_random_uuid(), 'Wellness Integral', 'Servicios de bienestar integral', NOW(), NOW()),
  (gen_random_uuid(), 'Breathe & Move', 'Clases de movimiento y respiración consciente', NOW(), NOW());

-- Re-enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Ensure public can read services
CREATE POLICY IF NOT EXISTS "Services are viewable by everyone" ON services
  FOR SELECT USING (true);

-- Only admins can modify services
CREATE POLICY IF NOT EXISTS "Services are editable by admins" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );