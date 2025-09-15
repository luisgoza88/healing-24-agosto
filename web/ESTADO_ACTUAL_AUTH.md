# Estado Actual de Autenticación - Healing Forest

## ✅ Lo que ya está implementado

### 1. Creación de usuarios sin email (parcialmente)
- **API Route creada**: `/api/admin/create-patient/route.ts`
- **Hook actualizado**: `useCreatePatient()` en `usePatients.ts`
- **Fallback inteligente**: Si no está configurada la service role key, usa el método tradicional

### 2. Código preparado para OAuth
- Documentación completa en `CONFIGURACION_AUTH.md`
- Ejemplos de código para Google y Apple Sign In

## ⚠️ Lo que necesitas hacer manualmente

### 1. Obtener y configurar Service Role Key
```bash
# 1. Ve a: https://app.supabase.com
# 2. Selecciona tu proyecto "HEALING APP"
# 3. Ve a Settings → API
# 4. Copia el "service_role" key
# 5. Agrégala a tu .env.local:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Configurar Google OAuth
En Supabase Dashboard:
1. Ve a **Authentication** → **Providers**
2. Activa **Google**
3. Necesitarás:
   - Google Client ID
   - Google Client Secret
   - URIs de callback configurados en Google Console

### 3. Configurar Apple Sign In
En Supabase Dashboard:
1. Ve a **Authentication** → **Providers**
2. Activa **Apple**
3. Necesitarás:
   - Apple Service ID
   - Apple Team ID
   - Apple Key ID
   - Apple Private Key (.p8)

## 🚫 Limitaciones del MCP

El MCP de Supabase NO puede:
- Acceder a la service role key (por seguridad)
- Configurar OAuth providers directamente
- Modificar configuraciones de autenticación

## 📱 Comportamiento esperado

### Admin crea usuario (Panel Web):
- NO envía email de confirmación
- Contraseña por defecto: "salud"
- Usuario puede iniciar sesión inmediatamente

### Usuario se registra (App Móvil):
- **Email**: SÍ envía confirmación
- **Google**: NO envía confirmación (automático)
- **Apple**: NO envía confirmación (automático)

## 🔧 Prueba actual

Mientras no tengas la service role key:
1. Los usuarios creados desde el admin SÍ recibirán email (comportamiento actual)
2. Una vez agregues la key, funcionará sin emails automáticamente
3. El código ya está preparado, solo falta la configuración

## 📝 Notas importantes

- El código tiene un fallback inteligente: si falla con service role, usa el método normal
- Esto permite que el sistema funcione aunque no esté completamente configurado
- Una vez agregues la service role key, todo funcionará automáticamente sin cambios de código