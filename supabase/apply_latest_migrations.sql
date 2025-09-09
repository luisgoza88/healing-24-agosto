-- Script para aplicar las últimas migraciones en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Primero ejecuta la migración de prevención de citas superpuestas
-- Esto incluye:
-- - Añadir servicios faltantes (Medicina Regenerativa, Faciales, Masajes)
-- - Función check_professional_availability
-- - Función get_professional_busy_slots
-- - Trigger prevent_overlapping_appointments
-- - Política RLS para DELETE en appointments
-- - Índices de rendimiento

-- Contenido del archivo: supabase/migrations/20240909_appointment_overlap_prevention.sql

-- 2. Verificar que las funciones se crearon correctamente
SELECT 
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname IN (
  'check_professional_availability',
  'get_professional_busy_slots',
  'prevent_overlapping_appointments'
);

-- 3. Verificar que el trigger existe
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'check_appointment_overlap';

-- 4. Verificar políticas RLS en appointments
SELECT 
  polname as policy_name,
  polcmd as command,
  pg_get_expr(polqual, polrelid) as policy_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'appointments';

-- 5. Verificar que los servicios fueron agregados
SELECT id, name, description 
FROM services 
WHERE id IN (
  '0d6ccb17-bab0-4dc2-b9f6-b2a304ca7c23',
  '9d35276b-41f2-411b-a592-3dd531931c51',
  '38e81852-e43c-4847-9d9c-8a3750138a51'
);