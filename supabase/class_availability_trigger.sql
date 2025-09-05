-- Función para notificar cuando se libera un cupo en una clase
CREATE OR REPLACE FUNCTION notify_class_availability()
RETURNS TRIGGER AS $$
DECLARE
  class_record RECORD;
BEGIN
  -- Solo procesar si se está cancelando una inscripción
  IF NEW.status = 'cancelled' AND OLD.status = 'enrolled' THEN
    -- Obtener información de la clase
    SELECT * INTO class_record
    FROM classes
    WHERE id = NEW.class_id;
    
    -- Verificar si la clase estaba llena antes de la cancelación
    IF class_record.current_capacity = class_record.max_capacity THEN
      -- Llamar a la Edge Function para notificar a la lista de espera
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

-- Crear trigger para notificar disponibilidad
DROP TRIGGER IF EXISTS notify_class_availability_trigger ON class_enrollments;
CREATE TRIGGER notify_class_availability_trigger
AFTER UPDATE ON class_enrollments
FOR EACH ROW
EXECUTE FUNCTION notify_class_availability();

-- Configurar las variables de entorno necesarias
-- Estas deben ser configuradas en Supabase Dashboard > Settings > Database > Extensions
-- Habilitar la extensión pg_net si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Nota: Las siguientes configuraciones deben hacerse desde el dashboard de Supabase
-- ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://tu-proyecto.supabase.co';
-- ALTER DATABASE postgres SET "app.settings.supabase_service_role_key" = 'tu-service-role-key';