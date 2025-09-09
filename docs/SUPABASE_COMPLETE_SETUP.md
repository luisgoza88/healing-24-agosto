# Configuración Completa de Supabase para Healing App

## 🚀 Inicio Rápido

### Opción 1: Ejecutar TODO de una vez (Recomendado para primera vez)

1. Ve a tu [Dashboard de Supabase](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea una nueva consulta
4. Copia y pega TODO el contenido del archivo:
   ```
   /supabase/migrations/00_MASTER_COMPLETE_SETUP.sql
   ```
5. Haz clic en "Run"

¡Listo! Todas las tablas están creadas.

### Opción 2: Ejecutar por módulos (Para desarrollo incremental)

Ejecuta los archivos en este orden:

1. **Base del usuario**:
   - `20240110_create_profiles_and_storage.sql`

2. **Sistema de citas médicas**:
   - `20240111_appointments_system.sql`

3. **Hot Studio**:
   - `20240112_hot_studio_system.sql`

4. **Breathe & Move**:
   - `20240113_breathe_move_complete.sql`

5. **Sistema de pagos**:
   - `20240114_payments_system.sql`

6. **Notificaciones**:
   - `20240109_create_notification_tables.sql`

## 📊 Estructura de la Base de Datos

### 1. **Usuarios y Perfiles**
- `profiles` - Información personal del usuario
- `avatars` (Storage) - Fotos de perfil

### 2. **Servicios Médicos**
- `services` - Servicios principales (Medicina Funcional, etc.)
- `sub_services` - Sub-servicios específicos
- `professionals` - Doctores y profesionales
- `professional_availability` - Horarios disponibles
- `appointments` - Citas médicas

### 3. **Hot Studio (Yoga/Fitness)**
- `class_types` - Tipos de clases (Yoga, Pilates, etc.)
- `instructors` - Instructores
- `hot_studio_memberships` - Tipos de membresías
- `user_memberships` - Membresías de usuarios
- `classes` - Clases programadas
- `class_enrollments` - Inscripciones a clases

### 4. **Breathe & Move**
- `breathe_move_classes` - Clases disponibles
- `breathe_move_package_types` - Tipos de paquetes
- `breathe_move_packages` - Paquetes comprados
- `breathe_move_enrollments` - Inscripciones

### 5. **Sistema de Pagos**
- `payment_methods` - Métodos de pago disponibles
- `payments` - Registro de pagos
- `discount_coupons` - Cupones de descuento
- `invoices` - Facturas

### 6. **Notificaciones**
- `notification_preferences` - Preferencias del usuario

## 🔒 Seguridad (RLS)

Todas las tablas tienen Row Level Security (RLS) habilitado:

- ✅ Los usuarios solo pueden ver/editar SU propia información
- ✅ Los servicios y profesionales son públicos
- ✅ Las fotos de perfil son públicas (para mostrarlas)
- ✅ Los pagos son privados por usuario

## 🧪 Verificar que Todo Funciona

### 1. Verificar Tablas
Ve a **Table Editor** y deberías ver todas estas tablas:
- profiles
- services
- appointments
- classes
- payments
- etc.

### 2. Verificar Storage
Ve a **Storage** y deberías ver:
- Bucket: `avatars` (público)

### 3. Verificar Políticas
Ve a **Authentication > Policies** y verifica que cada tabla tenga sus políticas RLS.

## 🎯 Datos de Prueba Incluidos

El script incluye datos iniciales:

### Servicios
- Medicina Funcional
- Medicina Estética  
- Wellness Integral
- Hot Studio

### Profesionales
- Dra. Estefanía González

### Métodos de Pago
- Nequi
- Daviplata
- Tarjeta de crédito/débito
- Efectivo

### Clases Hot Studio
- Yoga, Pilates, Sound Healing, etc.

### Paquetes Breathe & Move
- 4 clases - $260,000
- 8 clases - $480,000
- 12 clases - $660,000

## 🚨 Solución de Problemas

### Error: "permission denied for schema public"
- Asegúrate de estar usando el usuario correcto
- Verifica que tienes permisos de administrador

### Error: "relation already exists"
- Es normal si ya ejecutaste parte del script
- El script usa "IF NOT EXISTS" para evitar duplicados

### Error: "bucket not found"
- Ejecuta la parte de Storage del script
- Verifica en Storage que el bucket `avatars` existe

### Las políticas RLS no funcionan
- Verifica que RLS esté habilitado en cada tabla
- Revisa que el usuario esté autenticado

## 📝 Próximos Pasos

1. **Configurar variables de entorno** en tu `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=tu_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_key
   ```

2. **Probar la app**:
   - Crear una cuenta
   - Subir foto de perfil
   - Crear una cita
   - Inscribirse a una clase

3. **Monitorear** en el Dashboard de Supabase:
   - Ver registros en tiempo real
   - Revisar logs
   - Analizar uso

## 🔄 Actualizaciones Futuras

Para agregar nuevas funcionalidades:

1. Crea un nuevo archivo de migración:
   ```sql
   -- 20240120_new_feature.sql
   CREATE TABLE IF NOT EXISTS public.new_table...
   ```

2. Ejecuta solo ese archivo (no vuelvas a ejecutar todo)

3. Actualiza la documentación

## 💡 Tips

- **Desarrollo**: Usa un proyecto de Supabase para desarrollo
- **Producción**: Usa un proyecto separado para producción
- **Backups**: Supabase hace backups automáticos diarios
- **Monitoreo**: Revisa el uso en Dashboard > Reports

¿Necesitas ayuda? Los errores más comunes están en la sección de Solución de Problemas arriba.