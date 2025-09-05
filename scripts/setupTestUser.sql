-- Script para crear usuario de prueba en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- Primero, vamos a mejorar la función handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Para crear el usuario manualmente, ve a:
-- Authentication > Users > Add User
-- Y usa estos datos:
-- Email: lmg880@gmail.com
-- Password: Florida20
-- Auto Confirm User: ✓ (activado)