# 🏆 Sistema de Créditos - Instrucciones de Configuración

## ⚠️ IMPORTANTE: Migración de Base de Datos Requerida

Para que el sistema de créditos funcione correctamente, necesitas ejecutar la migración SQL en tu base de datos Supabase.

## 📋 Pasos para Activar el Sistema de Créditos

### 1. Ejecutar Migración SQL

1. Ve a tu **Dashboard de Supabase**
2. Navega a **SQL Editor**
3. Copia y pega el contenido del archivo `manual_credits_migration.sql`
4. Ejecuta el script

### 2. Verificar Instalación

Después de ejecutar la migración, puedes verificar que las tablas se crearon correctamente:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_credits', 'credit_transactions');
```

### 3. Crear Crédito de Prueba (Opcional)

Para probar el sistema, puedes crear un crédito de prueba:

```sql
-- Reemplaza 'TU-USER-ID' con un ID real de usuario
INSERT INTO user_credits (user_id, amount, credit_type, description, expires_at, created_by)
VALUES (
  'TU-USER-ID',
  50000,
  'promotion',
  'Crédito de bienvenida',
  NOW() + INTERVAL '12 months',
  'TU-USER-ID'
);
```

## 🎯 Características del Sistema de Créditos

### ✅ Funcionalidades Implementadas

- **Generación automática** de créditos al cancelar citas
- **Política escalonada** basada en tiempo de cancelación:
  - +24 horas: 100% del valor
  - 12-24 horas: 75% del valor
  - 4-12 horas: 50% del valor
  - -4 horas: 25% del valor
- **Expiración automática** (12 meses por defecto)
- **Sistema FIFO** para uso de créditos
- **Tipos de créditos**: cancelación, reembolso, promoción, ajuste admin
- **Historial completo** de transacciones

### 📱 Interfaces Disponibles

1. **App Móvil**: Pantalla "Mis Créditos" en perfil
2. **Web Client**: Página dedicada `/credits`
3. **Dashboard Admin**: Gestión completa en `/dashboard/credits`

### 🔒 Seguridad

- **Row Level Security (RLS)** habilitado
- Usuarios solo ven sus propios créditos
- Administradores tienen acceso completo
- Validaciones en todas las operaciones

## 🚀 Estado Actual

- ✅ **Base de datos**: Migración SQL lista
- ✅ **App móvil**: Completamente implementado
- ✅ **Web client**: Completamente implementado  
- ✅ **Dashboard admin**: Completamente implementado
- ✅ **Lógica de negocio**: Completamente implementado
- ⏳ **Activación**: Solo falta ejecutar migración SQL

## 📞 Soporte

Una vez ejecutes la migración SQL, el sistema de créditos estará completamente funcional. Si tienes algún problema:

1. Verifica que las tablas se crearon correctamente
2. Comprueba que las políticas RLS están activas
3. Revisa los logs de la aplicación para errores específicos

## 🎉 ¡Listo para Usar!

Después de la migración, tus usuarios podrán:
- Ver sus créditos disponibles
- Recibir créditos automáticamente al cancelar citas
- Usar créditos en futuras reservas
- Ver historial completo de transacciones

¡El sistema está diseñado para mejorar la experiencia del cliente y reducir el impacto de las cancelaciones!