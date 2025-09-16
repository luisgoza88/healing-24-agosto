-- Migration: DRIPS booking system with multiple simultaneous stations
-- Date: 2025-09-11
-- Description: Creates a system to handle up to 5 simultaneous DRIPS appointments with dynamic availability

-- Create table for DRIPS stations/chairs
CREATE TABLE drips_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_number INT NOT NULL CHECK (station_number BETWEEN 1 AND 5),
  name VARCHAR(50) NOT NULL DEFAULT 'Station',
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_station_number UNIQUE (station_number)
);

-- Insert the 5 DRIPS stations
INSERT INTO drips_stations (station_number, name) VALUES
  (1, 'Station 1'),
  (2, 'Station 2'),
  (3, 'Station 3'),
  (4, 'Station 4'),
  (5, 'Station 5');

-- Add station reference to appointments table
ALTER TABLE appointments 
ADD COLUMN drips_station_id UUID REFERENCES drips_stations(id),
ADD COLUMN end_time TIME GENERATED ALWAYS AS (
  CASE 
    WHEN appointment_time IS NOT NULL AND duration_minutes IS NOT NULL 
    THEN (appointment_time::time + (duration_minutes || ' minutes')::interval)::time
    ELSE NULL
  END
) STORED;

-- Add duration to appointments if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'appointments' 
                AND column_name = 'duration_minutes') THEN
    ALTER TABLE appointments ADD COLUMN duration_minutes INT;
  END IF;
END$$;

-- Create a view for DRIPS availability
CREATE OR REPLACE VIEW drips_availability AS
WITH appointment_slots AS (
  SELECT 
    a.appointment_date,
    a.appointment_time,
    a.appointment_time::time + (COALESCE(ss.duration_minutes, s.duration_minutes, 60) || ' minutes')::interval AS end_time,
    a.drips_station_id,
    ds.station_number,
    a.status
  FROM appointments a
  JOIN services s ON a.service_id = s.id
  LEFT JOIN sub_services ss ON a.sub_service_id = ss.id
  LEFT JOIN drips_stations ds ON a.drips_station_id = ds.id
  WHERE s.code = 'drips' 
    AND a.status IN ('confirmed', 'pending')
    AND a.appointment_date >= CURRENT_DATE
)
SELECT 
  date_trunc('day', generate_series(
    CURRENT_DATE, 
    CURRENT_DATE + interval '30 days', 
    interval '15 minutes'
  ))::date AS slot_date,
  generate_series(
    CURRENT_DATE, 
    CURRENT_DATE + interval '30 days', 
    interval '15 minutes'
  )::time AS slot_time,
  5 - COUNT(DISTINCT as1.drips_station_id) AS available_stations
FROM generate_series(
  CURRENT_DATE, 
  CURRENT_DATE + interval '30 days', 
  interval '15 minutes'
) AS time_slot
LEFT JOIN appointment_slots as1 
  ON time_slot::date = as1.appointment_date
  AND time_slot::time >= as1.appointment_time::time
  AND time_slot::time < as1.end_time
WHERE time_slot::time BETWEEN '08:00'::time AND '18:00'::time
  AND EXTRACT(dow FROM time_slot) BETWEEN 1 AND 6  -- Monday to Saturday
GROUP BY slot_date, slot_time;

-- Function to check DRIPS availability for a specific time and duration
CREATE OR REPLACE FUNCTION check_drips_availability(
  p_date DATE,
  p_time TIME,
  p_duration_minutes INT
)
RETURNS TABLE(
  available_station_id UUID,
  station_number INT,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.station_number,
    NOT EXISTS (
      SELECT 1 
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      LEFT JOIN sub_services ss ON a.sub_service_id = ss.id
      WHERE a.drips_station_id = ds.id
        AND a.appointment_date = p_date
        AND a.status IN ('confirmed', 'pending')
        AND s.code = 'drips'
        AND (
          -- New appointment would overlap with existing one
          (p_time >= a.appointment_time::time AND 
           p_time < (a.appointment_time::time + (COALESCE(ss.duration_minutes, s.duration_minutes, 60) || ' minutes')::interval))
          OR
          -- Existing appointment would overlap with new one
          (a.appointment_time::time >= p_time AND 
           a.appointment_time::time < (p_time + (p_duration_minutes || ' minutes')::interval))
        )
    ) AS is_available
  FROM drips_stations ds
  WHERE ds.status = 'available'
  ORDER BY ds.station_number;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically assign a DRIPS station
CREATE OR REPLACE FUNCTION assign_drips_station(
  p_appointment_id UUID,
  p_date DATE,
  p_time TIME,
  p_duration_minutes INT
)
RETURNS UUID AS $$
DECLARE
  v_station_id UUID;
BEGIN
  -- Get the first available station
  SELECT available_station_id INTO v_station_id
  FROM check_drips_availability(p_date, p_time, p_duration_minutes)
  WHERE is_available = true
  ORDER BY station_number
  LIMIT 1;
  
  IF v_station_id IS NULL THEN
    RAISE EXCEPTION 'No hay estaciones disponibles para este horario';
  END IF;
  
  -- Update the appointment with the assigned station
  UPDATE appointments
  SET drips_station_id = v_station_id
  WHERE id = p_appointment_id;
  
  RETURN v_station_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically assign DRIPS station on appointment creation
CREATE OR REPLACE FUNCTION auto_assign_drips_station()
RETURNS TRIGGER AS $$
DECLARE
  v_service_code VARCHAR;
  v_duration INT;
BEGIN
  -- Check if this is a DRIPS service
  SELECT s.code INTO v_service_code
  FROM services s
  WHERE s.id = NEW.service_id;
  
  IF v_service_code = 'drips' THEN
    -- Get duration
    SELECT COALESCE(ss.duration_minutes, s.duration_minutes, 60) INTO v_duration
    FROM services s
    LEFT JOIN sub_services ss ON ss.id = NEW.sub_service_id
    WHERE s.id = NEW.service_id;
    
    -- Store duration in appointment
    NEW.duration_minutes := v_duration;
    
    -- Assign station
    NEW.drips_station_id := assign_drips_station(
      NEW.id, 
      NEW.appointment_date, 
      NEW.appointment_time, 
      v_duration
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_assign_drips_station_trigger
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_drips_station();

-- Permissions
GRANT SELECT ON drips_stations TO authenticated;
GRANT SELECT ON drips_availability TO authenticated;
GRANT EXECUTE ON FUNCTION check_drips_availability TO authenticated;

-- RLS policies
ALTER TABLE drips_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DRIPS stations are viewable by all authenticated users" ON drips_stations
  FOR SELECT
  USING (true);