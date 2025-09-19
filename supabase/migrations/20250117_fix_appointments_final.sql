-- Migración final para corregir la tabla appointments
-- Esta migración consolida todas las correcciones necesarias

-- 1. Primero respaldamos los datos existentes si hay
CREATE TEMP TABLE appointments_backup AS 
SELECT * FROM appointments WHERE EXISTS (SELECT FROM appointments LIMIT 1);

-- 2. Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON appointments;

-- 3. Eliminar triggers y funciones relacionadas
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
DROP TRIGGER IF EXISTS prevent_appointment_overlap ON appointments;

-- 4. Eliminar índices existentes
DROP INDEX IF EXISTS idx_appointments_user_id;
DROP INDEX IF EXISTS idx_appointments_status;
DROP INDEX IF EXISTS idx_appointments_date;
DROP INDEX IF EXISTS idx_appointments_date_time;
DROP INDEX IF EXISTS idx_appointments_professional_date;

-- 5. Recrear la tabla con la estructura correcta
DROP TABLE IF EXISTS appointments CASCADE;

CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id VARCHAR(255) NOT NULL,
  professional_id VARCHAR(255) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_datetime TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (
    (appointment_date::timestamp + appointment_time::interval) AT TIME ZONE 'America/Mexico_City'
  ) STORED,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')
  ),
  total_amount DECIMAL(10,2) DEFAULT 0 CHECK (total_amount >= 0),
  notes TEXT,
  cancellation_reason TEXT,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'paid', 'refunded', 'failed')
  ),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Crear índices optimizados
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_service_id ON appointments(service_id);
CREATE INDEX idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX idx_appointments_date_time ON appointments(appointment_date, appointment_time);
CREATE INDEX idx_appointments_datetime ON appointments(appointment_datetime);
CREATE INDEX idx_appointments_status ON appointments(status) WHERE status != 'cancelled';
CREATE INDEX idx_appointments_payment_status ON appointments(payment_status) WHERE payment_status != 'paid';

-- 7. Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Función para prevenir citas superpuestas
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
    overlap_count INTEGER;
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Solo verificar para citas no canceladas
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;
    
    -- Calcular inicio y fin de la cita
    start_time := NEW.appointment_datetime;
    end_time := NEW.appointment_datetime + (NEW.duration_minutes || ' minutes')::interval;
    
    -- Verificar superposición
    SELECT COUNT(*)
    INTO overlap_count
    FROM appointments
    WHERE professional_id = NEW.professional_id
    AND status != 'cancelled'
    AND id != COALESCE(NEW.id, gen_random_uuid())
    AND appointment_datetime < end_time
    AND (appointment_datetime + (duration_minutes || ' minutes')::interval) > start_time;
    
    IF overlap_count > 0 THEN
        RAISE EXCEPTION 'Esta cita se superpone con otra existente para el mismo profesional';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Crear triggers
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER check_appointment_overlap_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION check_appointment_overlap();

-- 10. Habilitar RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 11. Crear políticas de seguridad mejoradas
-- Los usuarios pueden ver sus propias citas
CREATE POLICY "Users can view own appointments" ON appointments
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias citas
CREATE POLICY "Users can create own appointments" ON appointments
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id 
        AND status = 'pending'
        AND appointment_datetime > NOW()
    );

-- Los usuarios pueden actualizar sus propias citas (solo algunas columnas)
CREATE POLICY "Users can update own appointments" ON appointments
    FOR UPDATE 
    USING (
        auth.uid() = user_id 
        AND status IN ('pending', 'confirmed')
        AND appointment_datetime > NOW()
    );

-- Los usuarios pueden cancelar sus propias citas
CREATE POLICY "Users can cancel own appointments" ON appointments
    FOR UPDATE 
    USING (
        auth.uid() = user_id 
        AND status IN ('pending', 'confirmed')
        AND appointment_datetime > NOW()
    )
    WITH CHECK (
        status = 'cancelled'
        AND cancellation_reason IS NOT NULL
    );

-- Los administradores pueden ver todas las citas
CREATE POLICY "Admins can view all appointments" ON appointments
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Los profesionales pueden ver sus citas asignadas
CREATE POLICY "Professionals can view assigned appointments" ON appointments
    FOR SELECT 
    USING (
        professional_id = auth.uid()::text 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'professional'
            AND email = professional_id
        )
    );

-- 12. Restaurar datos si existen (con manejo de errores)
INSERT INTO appointments (
    id, user_id, service_id, professional_id, 
    appointment_date, appointment_time, status, 
    total_amount, notes, created_at, updated_at
)
SELECT 
    id, 
    user_id, 
    service_id, 
    professional_id,
    CASE 
        WHEN appointment_date IS NOT NULL THEN appointment_date::date
        ELSE CURRENT_DATE + INTERVAL '7 days'
    END as appointment_date,
    COALESCE(appointment_time, '10:00:00'::time) as appointment_time,
    COALESCE(status, 'pending') as status,
    COALESCE(total_amount, 0) as total_amount,
    notes,
    COALESCE(created_at, NOW()) as created_at,
    COALESCE(updated_at, NOW()) as updated_at
FROM appointments_backup
ON CONFLICT (id) DO NOTHING;

-- 13. Limpiar tabla temporal
DROP TABLE IF EXISTS appointments_backup;

-- 14. Crear función helper para obtener horarios disponibles
CREATE OR REPLACE FUNCTION get_available_slots(
    p_professional_id VARCHAR(255),
    p_date DATE,
    p_service_duration INTEGER DEFAULT 60
)
RETURNS TABLE (
    slot_time TIME,
    is_available BOOLEAN
) AS $$
DECLARE
    slot_start TIME := '09:00:00'::time;
    slot_end TIME := '18:00:00'::time;
    current_slot TIME;
BEGIN
    current_slot := slot_start;
    
    WHILE current_slot < slot_end LOOP
        RETURN QUERY
        SELECT 
            current_slot as slot_time,
            NOT EXISTS (
                SELECT 1 
                FROM appointments 
                WHERE professional_id = p_professional_id
                AND appointment_date = p_date
                AND status NOT IN ('cancelled', 'no_show')
                AND current_slot >= appointment_time
                AND current_slot < (appointment_time + (duration_minutes || ' minutes')::interval)
            ) as is_available;
            
        current_slot := current_slot + (p_service_duration || ' minutes')::interval;
    END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- 15. Comentario final
COMMENT ON TABLE appointments IS 'Tabla principal de citas médicas con soporte completo para gestión de horarios y pagos';
COMMENT ON COLUMN appointments.appointment_datetime IS 'Timestamp calculado automáticamente desde fecha y hora para facilitar consultas';
COMMENT ON FUNCTION get_available_slots IS 'Obtiene los horarios disponibles para un profesional en una fecha específica';