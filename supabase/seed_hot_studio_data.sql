-- Insertar instructores de ejemplo
INSERT INTO instructors (name, bio, specialties, is_active) VALUES
  ('María González', 'Instructora certificada de Yoga con 10 años de experiencia', ARRAY['Yoga', 'Meditación'], true),
  ('Carlos Rodríguez', 'Especialista en Pilates y entrenamiento funcional', ARRAY['Pilates', 'Fitness'], true),
  ('Ana Martínez', 'Facilitadora de Breathwork y terapias holísticas', ARRAY['Breathwork', 'Meditación'], true),
  ('Diego López', 'Terapeuta de sonido y músico profesional', ARRAY['Sound Healing', 'Meditación'], true);

-- Obtener IDs de los tipos de clases
WITH class_type_ids AS (
  SELECT id, name FROM class_types
),
instructor_ids AS (
  SELECT id, name FROM instructors
)

-- Insertar horarios de clases semanales
INSERT INTO class_schedules (class_type_id, instructor_id, day_of_week, start_time, end_time, is_active)
SELECT 
  ct.id,
  i.id,
  day_of_week,
  start_time::time,
  end_time::time,
  true
FROM (
  VALUES
    -- Lunes (1)
    ('Yoga', 'María González', 1, '07:00', '08:00'),
    ('Pilates', 'Carlos Rodríguez', 1, '09:00', '10:00'),
    ('Yoga', 'María González', 1, '18:00', '19:00'),
    
    -- Martes (2)
    ('Breathwork', 'Ana Martínez', 2, '07:30', '08:15'),
    ('Pilates', 'Carlos Rodríguez', 2, '10:00', '11:00'),
    ('Sound Healing', 'Diego López', 2, '19:00', '20:00'),
    
    -- Miércoles (3)
    ('Yoga', 'María González', 3, '06:30', '07:30'),
    ('Pilates', 'Carlos Rodríguez', 3, '09:00', '10:00'),
    ('Breathwork', 'Ana Martínez', 3, '18:30', '19:15'),
    
    -- Jueves (4)
    ('Yoga', 'María González', 4, '07:00', '08:00'),
    ('Sound Healing', 'Diego López', 4, '11:00', '12:00'),
    ('Pilates', 'Carlos Rodríguez', 4, '18:00', '19:00'),
    
    -- Viernes (5)
    ('Breathwork', 'Ana Martínez', 5, '07:00', '07:45'),
    ('Yoga', 'María González', 5, '09:00', '10:00'),
    ('Pilates', 'Carlos Rodríguez', 5, '17:00', '18:00'),
    
    -- Sábado (6)
    ('Yoga', 'María González', 6, '08:00', '09:00'),
    ('Sound Healing', 'Diego López', 6, '10:00', '11:00'),
    ('Breathwork', 'Ana Martínez', 6, '11:30', '12:15')
) AS schedule(class_name, instructor_name, day_of_week, start_time, end_time)
JOIN class_type_ids ct ON ct.name = schedule.class_name
JOIN instructor_ids i ON i.name = schedule.instructor_name;

-- Crear clases para las próximas 4 semanas
INSERT INTO classes (class_schedule_id, class_type_id, instructor_id, class_date, start_time, end_time, max_capacity, current_capacity, status)
SELECT 
  cs.id,
  cs.class_type_id,
  cs.instructor_id,
  date_trunc('week', CURRENT_DATE) + (cs.day_of_week - 1 + week_offset * 7) * interval '1 day',
  cs.start_time,
  cs.end_time,
  12,
  0,
  'scheduled'
FROM class_schedules cs
CROSS JOIN generate_series(0, 3) AS week_offset
WHERE cs.is_active = true
  AND date_trunc('week', CURRENT_DATE) + (cs.day_of_week - 1 + week_offset * 7) * interval '1 day' >= CURRENT_DATE;