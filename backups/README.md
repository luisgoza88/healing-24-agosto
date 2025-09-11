# Backup de Base de Datos

## Cómo hacer backup en Supabase:

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a Settings > Database
4. Click en 'Backups'
5. Descarga el backup más reciente

## Backup manual desde el panel:
También puedes hacer backup de tablas específicas desde el SQL Editor:

```sql
-- Exportar tabla appointments
COPY appointments TO '/tmp/appointments_backup.csv' WITH CSV HEADER;

-- Exportar tabla users  
COPY users TO '/tmp/users_backup.csv' WITH CSV HEADER;
```

## Fecha del último backup recomendado:
Tue Sep  9 16:12:09 -05 2025

