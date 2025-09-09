# Configuración de Supabase para Healing App

## Pasos para configurar la base de datos y storage

### 1. Ejecutar las migraciones en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Crea una nueva consulta y copia el contenido de estos archivos en orden:
   - `/supabase/migrations/20240109_create_notification_tables.sql`
   - `/supabase/migrations/20240110_create_profiles_and_storage.sql`
4. Ejecuta cada migración haciendo clic en "Run"

### 2. Verificar que todo esté configurado correctamente

#### Verificar la tabla profiles:
1. Ve a **Table Editor** en el menú lateral
2. Deberías ver la tabla `profiles` con las siguientes columnas:
   - id (UUID)
   - email
   - full_name
   - phone
   - bio
   - date_of_birth
   - gender
   - address
   - city
   - emergency_contact_name
   - emergency_contact_phone
   - medical_conditions
   - allergies
   - avatar_url
   - created_at
   - updated_at

#### Verificar el bucket de avatars:
1. Ve a **Storage** en el menú lateral
2. Deberías ver un bucket llamado `avatars`
3. El bucket debe estar marcado como "Public"

### 3. Configurar las políticas RLS (Row Level Security)

Las políticas ya están incluidas en las migraciones, pero puedes verificarlas:

1. Ve a **Authentication > Policies**
2. En la tabla `profiles`, deberías ver:
   - "Users can view own profile"
   - "Users can insert own profile"
   - "Users can update own profile"

3. En Storage, ve a **Storage > Policies**
4. Para el bucket `avatars`, deberías ver:
   - "Avatar images are publicly accessible"
   - "Anyone can upload an avatar"
   - "Users can update their own avatar"
   - "Users can delete their own avatar"

### 4. Configurar las variables de entorno

Asegúrate de tener estas variables en tu archivo `.env` local:

```
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

## Cómo funciona

### Guardar datos del perfil:
- Cuando un usuario actualiza su perfil en la app, los datos se guardan automáticamente en la tabla `profiles`
- La tabla usa el ID del usuario autenticado como clave primaria
- Los datos se actualizan mediante "upsert" (insert o update según exista o no)

### Subir fotos de perfil:
1. El usuario selecciona una foto de su galería
2. La foto se sube al bucket `avatars` en Supabase Storage
3. La URL pública de la foto se guarda en el campo `avatar_url` de la tabla `profiles`
4. La foto anterior se sobrescribe automáticamente

### Seguridad:
- Solo los usuarios autenticados pueden ver/editar su propio perfil
- Las fotos de perfil son públicas (para poder mostrarlas en la app)
- El tamaño máximo de foto es 5MB
- Solo se permiten formatos: JPEG, JPG, PNG, WEBP

## Solución de problemas

### Error: "Bucket not found"
- Ejecuta la migración `/supabase/migrations/20240110_create_profiles_and_storage.sql`
- Verifica que el bucket `avatars` existe en Storage

### Error: "Permission denied"
- Verifica que las políticas RLS estén configuradas correctamente
- Asegúrate de que el usuario esté autenticado

### La foto no se muestra
- Verifica que el bucket `avatars` esté marcado como público
- Revisa que la URL en `avatar_url` sea accesible

## Probar la funcionalidad

1. Inicia sesión en la app
2. Ve a "Mi Perfil" 
3. Completa los campos del formulario
4. Toca el ícono de cámara para cambiar la foto
5. Guarda los cambios
6. Los datos deberían aparecer en Supabase Dashboard