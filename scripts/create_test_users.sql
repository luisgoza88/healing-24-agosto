-- Script para crear usuarios de prueba con diferentes roles
-- NOTA: Ejecutar este script manualmente en Supabase Dashboard > SQL Editor

-- Los usuarios se crean con contraseña temporal: TestPassword123!
-- Cambiar las contraseñas después de la primera sesión

-- 1. Recepcionista
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'recepcion@healingforest.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "María Recepcionista"}',
  now(),
  now()
);

INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'recepcion@healingforest.com',
  'María Recepcionista',
  'receptionist',
  now(),
  now()
);

-- 2. Enfermera
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  'enfermera@healingforest.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Ana Enfermera"}',
  now(),
  now()
);

INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  'enfermera@healingforest.com',
  'Ana Enfermera',
  'nurse',
  now(),
  now()
);

-- 3. Profesional de Salud
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'a3333333-3333-3333-3333-333333333333',
  'doctor@healingforest.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Dr. Carlos Médico"}',
  now(),
  now()
);

INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'a3333333-3333-3333-3333-333333333333',
  'doctor@healingforest.com',
  'Dr. Carlos Médico',
  'professional',
  now(),
  now()
);

-- También crear el registro en la tabla professionals
INSERT INTO professionals (id, user_id, full_name, speciality, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'a3333333-3333-3333-3333-333333333333',
  'Dr. Carlos Médico',
  'Medicina General',
  true,
  now(),
  now()
);

-- 4. Gerente
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'a4444444-4444-4444-4444-444444444444',
  'gerente@healingforest.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Laura Gerente"}',
  now(),
  now()
);

INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'a4444444-4444-4444-4444-444444444444',
  'gerente@healingforest.com',
  'Laura Gerente',
  'manager',
  now(),
  now()
);

-- 5. Administrador
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  'a5555555-5555-5555-5555-555555555555',
  'admin@healingforest.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Pedro Administrador"}',
  now(),
  now()
);

INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'a5555555-5555-5555-5555-555555555555',
  'admin@healingforest.com',
  'Pedro Administrador',
  'admin',
  now(),
  now()
);

-- Verificar que todos los usuarios se crearon correctamente
SELECT 
  p.email,
  p.full_name,
  p.role,
  p.created_at
FROM profiles p
WHERE p.role != 'client'
ORDER BY p.created_at DESC;