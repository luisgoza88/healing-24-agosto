# Configuración de Autenticación - Healing Forest

## 1. Obtener Service Role Key

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings** → **API**
3. En la sección **Project API keys**, copia el **service_role** key (¡mantener secreta!)
4. Agrégala al archivo `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

## 2. Configurar Google OAuth

### En Google Cloud Console:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** → **Credentials**
4. Clic en **Create Credentials** → **OAuth client ID**
5. Selecciona **Web application**
6. Agrega estos URIs autorizados:
   - **Authorized JavaScript origins**: 
     - `https://vgwyhegpymqbljqtskra.supabase.co`
     - `http://localhost:3000` (para desarrollo)
   - **Authorized redirect URIs**:
     - `https://vgwyhegpymqbljqtskra.supabase.co/auth/v1/callback`
7. Guarda y copia el **Client ID** y **Client Secret**

### En Supabase:
1. Ve a **Authentication** → **Providers**
2. Activa **Google**
3. Pega el Client ID y Client Secret
4. Guarda los cambios

## 3. Configurar Apple Sign In

### En Apple Developer:
1. Ve a [Apple Developer](https://developer.apple.com/)
2. Ve a **Certificates, Identifiers & Profiles**
3. En **Identifiers**, crea un nuevo **App ID** con **Sign in with Apple** habilitado
4. En **Keys**, crea una nueva key con **Sign in with Apple** habilitado
5. Descarga el archivo `.p8` y guarda el Key ID

### En Supabase:
1. Ve a **Authentication** → **Providers**
2. Activa **Apple**
3. Completa:
   - **Service ID**: tu bundle ID (ej: com.healingforest.app)
   - **Team ID**: lo encuentras en tu cuenta de Apple Developer
   - **Key ID**: el ID de la key que creaste
   - **Private Key**: contenido del archivo `.p8`

## 4. Comportamiento del Sistema

### Para Administradores (Panel Web):
- Los administradores pueden crear usuarios SIN enviar emails de confirmación
- Contraseña por defecto: "salud"
- Los usuarios creados por admin tienen `email_confirm = true` automáticamente

### Para Usuarios (App Móvil):
- Los usuarios pueden registrarse con:
  - Email + Contraseña (SÍ se envía email de confirmación)
  - Google OAuth (sin email de confirmación)
  - Apple Sign In (sin email de confirmación)

## 5. Código de Implementación

### Login con Google (App Móvil):
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'com.healingforest.app://auth-callback'
  }
})
```

### Login con Apple (App Móvil):
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'apple',
  options: {
    redirectTo: 'com.healingforest.app://auth-callback'
  }
})
```

### Crear usuario desde Admin (sin email):
```typescript
// Esto usa la API route que creamos
const response = await fetch('/api/admin/create-patient', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'paciente@email.com',
    full_name: 'Juan Pérez',
    // ... otros datos
  })
})
```

## 6. Testing

Para probar sin la service role key:
1. Usa el registro normal (enviará email)
2. En Supabase Dashboard, ve a **Authentication** → **Users**
3. Puedes confirmar manualmente usuarios haciendo clic en "Confirm email"

## 7. Seguridad

- **NUNCA** exponer la service role key en el cliente
- Usar solo en API Routes o Server Components
- La anon key es segura para el cliente
- Configurar RLS (Row Level Security) apropiadamente