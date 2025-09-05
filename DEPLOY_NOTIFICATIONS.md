# Guía de Implementación de Notificaciones Remotas

## 1. Crear las tablas necesarias en Supabase

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Tabla para almacenar tokens de push notifications
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, token)
);

-- Tabla para historial de notificaciones
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  category TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Habilitar RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para push_tokens
CREATE POLICY "Users can view their own push tokens" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para notification_history
CREATE POLICY "Users can view their own notifications" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications" ON notification_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notification_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Índices para mejorar performance
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active);
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_read ON notification_history(read_at);
```

## 2. Habilitar pg_net extension

En Supabase Dashboard > Database > Extensions, busca y habilita `pg_net` si no está habilitada.

## 3. Configurar variables de entorno

En Supabase Dashboard > Settings > Edge Functions, agrega estas variables de entorno:

```bash
EXPO_PUSH_TOKEN_URL=https://exp.host/--/api/v2/push/send
```

## 4. Desplegar las Edge Functions

### Instalar Supabase CLI

```bash
npm install -g supabase
```

### Iniciar sesión en Supabase

```bash
supabase login
```

### Vincular tu proyecto

```bash
cd /Users/marianatejada/healing-24-agosto
supabase link --project-ref vgwyhegpymqbljqtskra
```

### Desplegar las funciones

```bash
# Función para enviar notificaciones push
supabase functions deploy send-push-notification

# Función para notificar disponibilidad de clases
supabase functions deploy notify-class-available

# Función para programar notificaciones
supabase functions deploy schedule-notifications
```

## 5. Configurar el trigger de disponibilidad

Ejecuta este SQL en Supabase después de habilitar pg_net:

```sql
-- Configurar las variables necesarias
ALTER DATABASE postgres 
SET "app.settings.supabase_url" = 'https://vgwyhegpymqbljqtskra.supabase.co';

-- IMPORTANTE: Reemplaza 'your-service-role-key' con tu service role key real
ALTER DATABASE postgres 
SET "app.settings.supabase_service_role_key" = 'your-service-role-key';

-- Crear el trigger
CREATE OR REPLACE FUNCTION notify_class_availability()
RETURNS TRIGGER AS $$
DECLARE
  class_record RECORD;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'enrolled' THEN
    SELECT * INTO class_record
    FROM classes
    WHERE id = NEW.class_id;
    
    IF class_record.current_capacity = class_record.max_capacity THEN
      PERFORM
        net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-class-available',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
          ),
          body := jsonb_build_object('classId', NEW.class_id)
        );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_class_availability_trigger ON class_enrollments;
CREATE TRIGGER notify_class_availability_trigger
AFTER UPDATE ON class_enrollments
FOR EACH ROW
EXECUTE FUNCTION notify_class_availability();
```

## 6. Configurar cron job para notificaciones programadas (opcional)

Si quieres notificaciones automáticas de recordatorios:

```sql
-- En Supabase Dashboard > SQL Editor
SELECT
  cron.schedule(
    'check-notifications',
    '*/5 * * * *', -- Cada 5 minutos
    $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/schedule-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  );
```

## 7. Probar las notificaciones

### Prueba de notificación local (en la app):

```javascript
// En cualquier componente
import { notificationService } from '../services/notificationService';

// Enviar notificación de prueba
await notificationService.scheduleLocalNotification(
  'Prueba Local',
  'Esta es una notificación de prueba',
  { test: true },
  new Date(Date.now() + 5000) // 5 segundos
);
```

### Prueba de notificación remota:

```javascript
// En cualquier componente
import { remoteNotificationService } from '../services/remoteNotificationService';

// Enviar a usuario actual
await remoteNotificationService.sendToUser(
  userId,
  'Prueba Remota',
  'Esta notificación viene del servidor',
  { test: true },
  'appointment_reminder' // Para probar acciones rápidas
);
```

## 8. Verificar funcionamiento

1. **Verificar tokens**: En Supabase, revisa la tabla `push_tokens` para confirmar que se están guardando.

2. **Logs de Edge Functions**: En Supabase Dashboard > Functions, revisa los logs de cada función.

3. **Probar acciones rápidas**:
   - Envía una notificación con categoría `appointment_reminder`
   - Deberías ver los botones "Confirmar asistencia" y "Cancelar cita"
   - Al presionar "Confirmar", la cita se actualizará sin abrir la app

## 9. Troubleshooting

### Si las notificaciones no llegan:
1. Verifica que el dispositivo sea físico (no simulador)
2. Confirma permisos de notificaciones en configuración del dispositivo
3. Revisa que el token esté guardado en `push_tokens`
4. Verifica logs de Edge Functions

### Si las acciones rápidas no funcionan:
1. Asegúrate de incluir `categoryId` al enviar la notificación
2. Verifica que las categorías estén registradas (se hace automáticamente al iniciar)
3. En iOS, las acciones requieren 3D Touch o mantener presionada la notificación

## 10. Uso en producción

Para producción, considera:
1. Implementar rate limiting en las Edge Functions
2. Agregar analytics de notificaciones
3. Permitir a usuarios configurar preferencias de notificaciones
4. Implementar reintentos para notificaciones fallidas