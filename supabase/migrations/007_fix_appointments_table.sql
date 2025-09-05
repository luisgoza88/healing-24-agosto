-- Agregar columnas faltantes a la tabla appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS appointment_time TIME NOT NULL DEFAULT '09:00:00';

-- Si la columna appointment_date es timestamp, cambiarla a date
ALTER TABLE appointments 
ALTER COLUMN appointment_date TYPE DATE USING appointment_date::DATE;

-- Agregar índice para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_appointments_date_time 
ON appointments(appointment_date, appointment_time);

-- Actualizar las citas existentes para tener una hora válida
UPDATE appointments 
SET appointment_time = '10:00:00' 
WHERE appointment_time IS NULL;