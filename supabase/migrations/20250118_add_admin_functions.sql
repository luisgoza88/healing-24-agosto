-- Función para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  user_role_var user_role;
BEGIN
  -- Obtener el rol del usuario
  SELECT role INTO user_role_var
  FROM profiles
  WHERE id = user_uuid;
  
  -- Verificar si es admin, manager o super_admin
  RETURN user_role_var IN ('admin', 'super_admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener los roles del usuario
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid uuid)
RETURNS text[] AS $$
DECLARE
  user_role_var user_role;
BEGIN
  -- Obtener el rol del usuario
  SELECT role INTO user_role_var
  FROM profiles
  WHERE id = user_uuid;
  
  -- Retornar array con el rol
  RETURN ARRAY[user_role_var::text];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos para ejecutar estas funciones
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles(uuid) TO authenticated;

-- Actualizar tu usuario a admin
-- NOTA: Reemplaza 'tu-email@ejemplo.com' con tu email real
UPDATE profiles 
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'img880@gmail.com'
);