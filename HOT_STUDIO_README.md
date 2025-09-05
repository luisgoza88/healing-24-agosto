# Hot Studio - Sistema de Clases Grupales

## 🧘‍♀️ Descripción
Hot Studio es un sistema completo de gestión de clases grupales para Healing Forest, que incluye:
- Yoga
- Pilates
- Breathwork
- Sound Healing

## 🚀 Características

### Sistema de Membresías
- **Paquetes de clases**: 5 o 10 clases con validez de 90-120 días
- **Membresías ilimitadas**: Mensual, trimestral o anual
- **Validación automática**: El sistema valida la membresía antes de permitir inscripciones
- **Descuento automático**: Las clases se descuentan automáticamente de los paquetes

### Gestión de Clases
- **Calendario semanal**: Vista de 7 días con navegación entre semanas
- **Límite de capacidad**: Máximo 12 personas por clase
- **Lista de espera**: Cuando una clase está llena
- **Inscripción y cancelación**: Los usuarios pueden gestionar sus inscripciones

### Para Usuarios
- **Mi Membresía**: Vista detallada con estadísticas y beneficios
- **Historial de clases**: Registro de todas las clases tomadas
- **Recordatorios**: (Próximamente) Notificaciones de clases próximas

## 📱 Cómo usar Hot Studio

### 1. Primera vez - Sin membresía
1. Ve a la pestaña "Hot Studio"
2. Toca "Obtén tu membresía para empezar"
3. Selecciona el tipo de membresía que deseas
4. Completa el pago
5. ¡Listo! Ya puedes inscribirte en clases

### 2. Con membresía activa
1. Ve a la pestaña "Hot Studio"
2. Navega por el calendario semanal
3. Selecciona el día que deseas
4. Toca una clase disponible para inscribirte
5. Confirma tu inscripción

### 3. Gestionar inscripciones
- **Ver detalles**: Toca una clase en la que estés inscrito
- **Cancelar**: Desde los detalles de la clase, toca "Cancelar inscripción"
- **Ver tu membresía**: Toca el badge de membresía en la esquina superior derecha

## 🛠️ Configuración inicial (para desarrolladores)

### 1. Base de datos
Asegúrate de haber ejecutado estos SQL en Supabase:
- `hot_studio_tables.sql` - Crea las tablas necesarias
- `seed_hot_studio_data.sql` - Crea instructores y clases de ejemplo

### 2. Iniciar la aplicación
```bash
# Con el script de inicio
./start.sh

# O manualmente
npx expo start
```

## 📊 Estructura de datos

### Tablas principales
- `class_types`: Tipos de clases (Yoga, Pilates, etc.)
- `instructors`: Información de instructores
- `class_schedules`: Horarios semanales recurrentes
- `classes`: Instancias específicas de clases
- `membership_types`: Tipos de membresías disponibles
- `user_memberships`: Membresías de usuarios
- `class_enrollments`: Inscripciones a clases
- `class_waitlist`: Lista de espera

### Flujo de datos
1. Usuario compra membresía → `user_memberships`
2. Usuario se inscribe → `class_enrollments`
3. Capacidad se actualiza → trigger automático
4. Clases se descuentan → trigger automático

## 🎯 Próximas mejoras
- [ ] Notificaciones push para recordatorios
- [ ] Integración con calendario nativo
- [ ] Check-in con código QR
- [ ] Métricas y reportes para administradores
- [ ] Sistema de evaluación de clases