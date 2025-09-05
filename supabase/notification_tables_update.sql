-- Agregar columnas para rastrear notificaciones enviadas en la tabla appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS notification_24h_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_2h_sent TIMESTAMP WITH TIME ZONE;

-- Crear índices para mejorar las consultas de notificaciones
CREATE INDEX IF NOT EXISTS idx_appointments_notification_24h 
ON appointments(appointment_date, status, notification_24h_sent);

CREATE INDEX IF NOT EXISTS idx_appointments_notification_2h 
ON appointments(appointment_date, status, notification_2h_sent);

-- Crear índice para mejorar consultas de clases próximas
CREATE INDEX IF NOT EXISTS idx_classes_start_time 
ON classes(start_time);

-- Crear índice para lista de espera
CREATE INDEX IF NOT EXISTS idx_class_waitlist_position 
ON class_waitlist(class_id, position);