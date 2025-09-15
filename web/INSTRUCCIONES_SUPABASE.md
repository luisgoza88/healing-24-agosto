# Configuración de Supabase para Deshabilitar Emails de Confirmación

## Opción 1: Deshabilitar confirmación de email (Recomendado)

1. Ingresa a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Authentication** → **Providers** → **Email**
3. Desactiva la opción **"Confirm email"**
4. Guarda los cambios

## Opción 2: Modificar plantillas de email

1. Ve a **Authentication** → **Email Templates**
2. Puedes dejar las plantillas vacías o personalizarlas
3. En **Settings**, desactiva "Enable email confirmations"

## Opción 3: Usar función SQL para crear usuarios

Si las opciones anteriores no están disponibles, puedes crear esta función en el SQL Editor:

```sql
-- Función para crear usuarios sin confirmación
CREATE OR REPLACE FUNCTION create_user_without_confirmation(
  user_email TEXT,
  user_password TEXT,
  user_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(user_id UUID) AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Crear usuario en auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(), -- Marcar como confirmado inmediatamente
    user_metadata,
    NOW(),
    NOW()
  ) RETURNING id INTO new_user_id;

  -- El trigger handle_new_user debería crear el perfil automáticamente
  
  RETURN QUERY SELECT new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos solo a usuarios autenticados
GRANT EXECUTE ON FUNCTION create_user_without_confirmation TO authenticated;
```

## Configuración actual del sistema

- Los usuarios nuevos se crean con la contraseña por defecto: **"salud"**
- No se envían emails de confirmación
- El administrador puede crear usuarios directamente desde el panel
- Los usuarios deberán cambiar su contraseña en el primer acceso

## Notas importantes

- Si los emails siguen enviándose después de estos cambios, revisa la configuración de tu proyecto
- Puedes usar un servicio SMTP personalizado si necesitas mayor control
- Considera implementar un sistema de invitaciones en lugar de crear usuarios directamente