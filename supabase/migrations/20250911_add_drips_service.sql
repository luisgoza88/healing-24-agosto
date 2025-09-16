-- Migration: Add DRIPS service and reassign sub-services
-- Date: 2025-09-11
-- Description: Creates new DRIPS service category and moves IV drips, NAD treatments, and ozone therapy from Medicina Regenerativa

-- Insert new DRIPS service
INSERT INTO services (id, code, name, description, duration_minutes, base_price, created_at, updated_at)
VALUES (
  'c4a5e8f2-9b3d-4e1a-8f7c-2d9a3b4c5e6f',
  'drips',
  'DRIPS - Sueroterapia',
  'Terapias intravenosas y sueroterapia',
  60,
  265000,
  NOW(),
  NOW()
);

-- First, let's get the service IDs for reference
-- Medicina Regenerativa ID: 0d6ccb17-bab0-4dc2-b9f6-b2a304ca7c23
-- New DRIPS ID: c4a5e8f2-9b3d-4e1a-8f7c-2d9a3b4c5e6f

-- Update sub_services to move treatments from Medicina Regenerativa to DRIPS
-- This updates: Vitaminas - IV Drips, NAD treatments, and Ozone therapy
UPDATE sub_services
SET 
  service_id = 'c4a5e8f2-9b3d-4e1a-8f7c-2d9a3b4c5e6f',
  updated_at = NOW()
WHERE 
  service_id = '0d6ccb17-bab0-4dc2-b9f6-b2a304ca7c23'
  AND (
    name LIKE '%Vitaminas%IV Drips%' OR
    name LIKE '%NAD%mg%' OR
    name LIKE '%Ozonoterapia%'
  );

-- Update any existing appointments that reference these sub-services
-- to ensure they point to the correct parent service
UPDATE appointments a
SET 
  service_id = 'c4a5e8f2-9b3d-4e1a-8f7c-2d9a3b4c5e6f',
  updated_at = NOW()
FROM sub_services s
WHERE 
  a.sub_service_id = s.id
  AND s.service_id = 'c4a5e8f2-9b3d-4e1a-8f7c-2d9a3b4c5e6f'
  AND a.service_id = '0d6ccb17-bab0-4dc2-b9f6-b2a304ca7c23';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON services TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sub_services TO authenticated;

-- Add RLS policy for the new service
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_services ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'services' 
    AND policyname = 'Services are viewable by all authenticated users'
  ) THEN
    CREATE POLICY "Services are viewable by all authenticated users" ON services
      FOR SELECT
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sub_services' 
    AND policyname = 'Sub-services are viewable by all authenticated users'
  ) THEN
    CREATE POLICY "Sub-services are viewable by all authenticated users" ON sub_services
      FOR SELECT
      USING (true);
  END IF;
END$$;

-- Verify the migration
DO $$
DECLARE
  moved_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO moved_count
  FROM sub_services
  WHERE service_id = 'c4a5e8f2-9b3d-4e1a-8f7c-2d9a3b4c5e6f';
  
  RAISE NOTICE 'Moved % sub-services to DRIPS service', moved_count;
END$$;