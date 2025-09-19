# Migraciones de Base de Datos - Healing Forest

## 📋 Migraciones Críticas para Producción

### 1. **20250117_fix_appointments_final.sql**
   - **Prioridad**: CRÍTICA
   - **Descripción**: Corrige la estructura completa de la tabla appointments
   - **Características**:
     - Separación de fecha y hora
     - Prevención de citas superpuestas
     - Campos de pago y estados
     - Políticas RLS mejoradas
     - Función para obtener horarios disponibles

### 2. **20250117_create_transactions_table.sql**
   - **Prioridad**: ALTA
   - **Descripción**: Crea tabla de transacciones para registro de pagos
   - **Características**:
     - Registro completo de transacciones
     - Integración con PayU
     - Estados de pago
     - Políticas de seguridad

## 🚀 Cómo Ejecutar las Migraciones

### Opción 1: Script Automatizado (Desarrollo)

```bash
# Instalar dependencias si no lo has hecho
npm install

# Ejecutar migraciones en desarrollo
node scripts/run-migrations.js

# Ejecutar para producción (muestra SQLs para copiar/pegar)
node scripts/run-migrations.js --production
```

### Opción 2: Manual en Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Ejecuta primero este SQL para crear la tabla de tracking:

```sql
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

4. Ejecuta cada migración en orden:
   - `20250117_fix_appointments_final.sql`
   - `20250117_create_transactions_table.sql`

5. Después de cada migración exitosa, registra:

```sql
INSERT INTO _migrations (filename) VALUES ('20250117_fix_appointments_final.sql');
INSERT INTO _migrations (filename) VALUES ('20250117_create_transactions_table.sql');
```

## ⚠️ Consideraciones Importantes

### Antes de Ejecutar

1. **Backup**: Siempre haz backup de tu base de datos antes de migraciones
   ```sql
   -- En Supabase: Settings > Backups > Create backup
   ```

2. **Verificar Datos Existentes**: La migración de appointments intenta preservar datos:
   ```sql
   -- Ver cuántas citas existen
   SELECT COUNT(*) FROM appointments;
   ```

3. **Horario de Baja Actividad**: Ejecuta durante horas de poco tráfico

### Después de Ejecutar

1. **Verificar Estructura**:
   ```sql
   -- Verificar nueva estructura de appointments
   \d appointments
   
   -- Verificar que las políticas RLS estén activas
   SELECT * FROM pg_policies WHERE tablename = 'appointments';
   ```

2. **Test de Funcionalidad**:
   ```sql
   -- Probar función de horarios disponibles
   SELECT * FROM get_available_slots('professional-id', '2024-01-20', 60);
   ```

3. **Verificar Datos Migrados**:
   ```sql
   -- Verificar que las citas se migraron correctamente
   SELECT id, appointment_date, appointment_time, status 
   FROM appointments 
   LIMIT 10;
   ```

## 🔄 Rollback (Si es necesario)

Si algo sale mal, aquí está el SQL para revertir:

```sql
-- Revertir appointments (¡CUIDADO! Esto elimina la tabla)
DROP TABLE IF EXISTS appointments CASCADE;

-- Revertir transactions
DROP TABLE IF EXISTS transactions CASCADE;

-- Luego restaurar desde backup
```

## 📝 Orden de Migraciones

Las migraciones deben ejecutarse en orden cronológico. El formato es:
- `YYYYMMDD_descripcion.sql`

Migraciones actuales en orden:
1. Migraciones base (ya ejecutadas en tu sistema)
2. `20250117_fix_appointments_final.sql` ← EJECUTAR
3. `20250117_create_transactions_table.sql` ← EJECUTAR

## 🆘 Solución de Problemas

### Error: "permission denied"
- Asegúrate de usar el Service Role Key, no el Anon Key

### Error: "relation already exists"
- La tabla ya existe, verifica con `\dt` en SQL Editor

### Error: "violates foreign key constraint"
- Hay referencias a datos que no existen, revisa las relaciones

### Las políticas RLS no funcionan
```sql
-- Verificar que RLS esté habilitado
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Supabase Dashboard > Logs
2. Verifica que las variables de entorno estén correctas
3. Asegúrate de tener los permisos necesarios