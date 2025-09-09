-- Migration: Prevención de citas superpuestas y gestión de disponibilidad
-- Date: 2024-09-09

-- 1. Añadir servicios faltantes si no existen
INSERT INTO services (id, name, description, created_at, updated_at)
VALUES 
  ('0d6ccb17-bab0-4dc2-b9f6-b2a304ca7c23', 'Medicina Regenerativa', 'Medicina Regenerativa & Longevidad', NOW(), NOW()),
  ('9d35276b-41f2-411b-a592-3dd531931c51', 'Faciales', 'Tratamientos faciales especializados', NOW(), NOW()),
  ('38e81852-e43c-4847-9d9c-8a3750138a51', 'Masajes', 'Masajes terapéuticos y relajantes', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Función para verificar disponibilidad del profesional
CREATE OR REPLACE FUNCTION check_professional_availability(
  p_professional_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_available BOOLEAN;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1
    FROM appointments
    WHERE professional_id = p_professional_id
      AND appointment_date = p_date
      AND status NOT IN ('cancelled')
      AND (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id)
      AND (
        -- La nueva cita empieza durante una existente
        (p_start_time >= appointment_time AND p_start_time < end_time)
        OR
        -- La nueva cita termina durante una existente
        (p_end_time > appointment_time AND p_end_time <= end_time)
        OR
        -- La nueva cita envuelve completamente una existente
        (p_start_time <= appointment_time AND p_end_time >= end_time)
        OR
        -- Una cita existente está completamente dentro de la nueva
        (appointment_time >= p_start_time AND end_time <= p_end_time)
      )
  ) INTO v_is_available;
  
  RETURN v_is_available;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para obtener slots ocupados
CREATE OR REPLACE FUNCTION get_professional_busy_slots(
  p_professional_id UUID,
  p_date DATE
)
RETURNS TABLE(start_time TIME, end_time TIME) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    appointment_time::TIME as start_time,
    end_time::TIME as end_time
  FROM appointments
  WHERE professional_id = p_professional_id
    AND appointment_date = p_date
    AND status NOT IN ('cancelled')
  ORDER BY appointment_time;
END;
$$ LANGUAGE plpgsql;

-- 4. Función trigger para prevenir citas superpuestas
CREATE OR REPLACE FUNCTION prevent_overlapping_appointments()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_professional_availability(
    NEW.professional_id,
    NEW.appointment_date,
    NEW.appointment_time::TIME,
    NEW.end_time::TIME,
    CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
  ) THEN
    RAISE EXCEPTION 'El profesional ya tiene una cita programada en ese horario';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear el trigger
DROP TRIGGER IF EXISTS check_appointment_overlap ON appointments;
CREATE TRIGGER check_appointment_overlap
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_overlapping_appointments();

-- 6. Actualizar política RLS para permitir DELETE
DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;
CREATE POLICY "Users can delete their own appointments" 
  ON appointments 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 7. Añadir índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_appointments_professional_date 
  ON appointments(professional_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON appointments(status);

COMMENT ON FUNCTION check_professional_availability IS 'Verifica si un profesional está disponible en un horario específico';
COMMENT ON FUNCTION get_professional_busy_slots IS 'Obtiene los horarios ocupados de un profesional en una fecha específica';
COMMENT ON FUNCTION prevent_overlapping_appointments IS 'Trigger function para prevenir citas superpuestas';