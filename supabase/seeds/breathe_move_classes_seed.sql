-- Script para poblar clases de Breathe & Move de ejemplo

-- Insertar algunas clases para la semana actual
INSERT INTO breathe_move_classes (class_name, instructor, class_date, start_time, end_time, max_capacity, intensity)
VALUES 
  -- Lunes
  ('StoneBarre', 'JENNY', CURRENT_DATE + INTERVAL '0 days', '06:00', '06:50', 12, 'medium'),
  ('WildPower', 'MAICOL', CURRENT_DATE + INTERVAL '0 days', '08:00', '08:50', 12, 'high'),
  ('OmRoot', 'JENNY', CURRENT_DATE + INTERVAL '0 days', '18:00', '18:50', 12, 'low'),
  ('FireRush', 'MAICOL', CURRENT_DATE + INTERVAL '0 days', '19:00', '19:50', 12, 'high'),
  
  -- Martes
  ('OmRoot', 'JENNY', CURRENT_DATE + INTERVAL '1 days', '06:00', '06:50', 12, 'low'),
  ('FireRush', 'MAICOL', CURRENT_DATE + INTERVAL '1 days', '08:00', '08:50', 12, 'high'),
  ('BloomBeat', 'JENNY', CURRENT_DATE + INTERVAL '1 days', '18:00', '18:50', 12, 'medium'),
  ('WildPower', 'MAICOL', CURRENT_DATE + INTERVAL '1 days', '19:00', '19:50', 12, 'high'),
  
  -- Miércoles
  ('StoneBarre', 'JENNY', CURRENT_DATE + INTERVAL '2 days', '06:00', '06:50', 12, 'medium'),
  ('WildPower', 'MAICOL', CURRENT_DATE + INTERVAL '2 days', '08:00', '08:50', 12, 'high'),
  ('WindMove', 'JENNY', CURRENT_DATE + INTERVAL '2 days', '18:00', '18:50', 12, 'low'),
  ('HazeRocket', 'MAICOL', CURRENT_DATE + INTERVAL '2 days', '19:00', '19:50', 12, 'high'),
  
  -- Jueves
  ('GutReboot', 'JENNY', CURRENT_DATE + INTERVAL '3 days', '06:00', '06:50', 12, 'low'),
  ('FireRush', 'MAICOL', CURRENT_DATE + INTERVAL '3 days', '08:00', '08:50', 12, 'high'),
  ('ForestFire', 'JENNY', CURRENT_DATE + INTERVAL '3 days', '18:00', '18:50', 12, 'medium'),
  ('WildPower', 'MAICOL', CURRENT_DATE + INTERVAL '3 days', '19:00', '19:50', 12, 'high'),
  
  -- Viernes
  ('OmRoot', 'JENNY', CURRENT_DATE + INTERVAL '4 days', '06:00', '06:50', 12, 'low'),
  ('WildPower', 'MAICOL', CURRENT_DATE + INTERVAL '4 days', '08:00', '08:50', 12, 'high'),
  ('BloomBeat', 'JENNY', CURRENT_DATE + INTERVAL '4 days', '18:00', '18:50', 12, 'medium'),
  ('FireRush', 'MAICOL', CURRENT_DATE + INTERVAL '4 days', '19:00', '19:50', 12, 'high'),
  
  -- Sábado
  ('HazeRocket', 'JUANA', CURRENT_DATE + INTERVAL '5 days', '08:00', '08:50', 12, 'high'),
  ('WindMove', 'JENNY', CURRENT_DATE + INTERVAL '5 days', '09:00', '09:50', 12, 'low'),
  ('WindFlow', 'JUANA', CURRENT_DATE + INTERVAL '5 days', '10:00', '10:50', 12, 'medium'),
  ('MoonRelief', 'JENNY', CURRENT_DATE + INTERVAL '5 days', '11:00', '11:50', 12, 'low');

-- Nota: Este script está diseñado para ser ejecutado manualmente para poblar datos de ejemplo
-- Las fechas se basan en CURRENT_DATE para siempre tener clases disponibles