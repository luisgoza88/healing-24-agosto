-- Seed/Sync package_types with mobile app defaults
insert into public.package_types (name, classes_included, duration_days, price, color, is_active, service_code)
values
  ('1 Clase', 1, 30, 50000, '#4CAF50', true, 'breathe_move'),
  ('4 Clases', 4, 60, 180000, '#4CAF50', true, 'breathe_move'),
  ('8 Clases', 8, 90, 320000, '#4CAF50', true, 'breathe_move'),
  ('Mensualidad', null, 30, 220000, '#4CAF50', true, 'breathe_move'),
  ('Bimestral', null, 60, 400000, '#4CAF50', true, 'breathe_move'),
  ('Trimestre', null, 90, 560000, '#4CAF50', true, 'breathe_move'),
  ('Semestral', null, 180, 980000, '#4CAF50', true, 'breathe_move'),
  ('Anual', null, 365, 1700000, '#4CAF50', true, 'breathe_move')
on conflict (name)
do update set
  classes_included = excluded.classes_included,
  duration_days = excluded.duration_days,
  price = excluded.price,
  color = excluded.color,
  is_active = excluded.is_active,
  service_code = excluded.service_code;


