# 🔐 Solución para el Login del Panel Administrativo

## El Problema
El panel administrativo verifica que el usuario tenga rol de `admin` usando una función RPC en Supabase que no existe. Por eso no puedes entrar aunque uses las credenciales correctas.

## Solución Rápida

### Opción 1: Ejecutar la migración en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Copia y ejecuta este SQL:

```sql
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
```

4. Luego ejecuta este SQL para hacer tu usuario admin:

```sql
-- Actualizar tu usuario a admin
UPDATE profiles 
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'img880@gmail.com'
);
```

### Opción 2: Desactivar temporalmente la verificación (Solo para desarrollo)

Si necesitas acceso inmediato mientras configuras todo, puedes modificar temporalmente el archivo `web/app/page.tsx`:

1. Abre `web/app/page.tsx`
2. Comenta las líneas 30-35:

```typescript
// Verificar que el usuario tenga rol de admin
// const isAdmin = await checkIsAdmin(data.user.id);

// if (!isAdmin) {
//   throw new Error("No tienes permisos de administrador");
// }
```

3. Guarda el archivo y vuelve a intentar el login

## Verificar que funciona

Después de hacer cualquiera de las dos opciones, deberías poder:
1. Ir a http://localhost:3000
2. Ingresar con tu email: img880@gmail.com
3. Ingresar tu contraseña
4. Acceder al panel administrativo

## Nota Importante

Si usaste la Opción 2, recuerda volver a activar la verificación de admin cuando hayas configurado correctamente los roles en la base de datos.

## ¿Aún tienes problemas?

Si sigues sin poder entrar, verifica:
1. Que el usuario existe en Supabase (Authentication > Users)
2. Que existe un registro en la tabla `profiles` para ese usuario
3. Que el campo `role` en profiles sea 'admin'

También puedes verificar en SQL Editor:
```sql
-- Ver tu usuario y rol
SELECT 
  u.id,
  u.email,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'img880@gmail.com';
```