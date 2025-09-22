# Dashboard Administrativo de Healing Forest

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

```bash
cd /Users/marianatejada/Documents/GitHub/healing-24-agosto/healing-forest-dashboard
npm install
```

### 2. Ejecutar el Proyecto

```bash
npm run dev
```

El dashboard estará disponible en: **http://localhost:3000**

## 📱 Integración con la App Móvil

Este dashboard está completamente integrado con tu app móvil de React Native:
- **Misma base de datos** en Supabase
- **Mismos usuarios y permisos**
- **Datos sincronizados en tiempo real**

## 🎨 Personalización Healing Forest

Los colores y estilos ya están configurados con la paleta de Healing Forest:
- Verde bosque (#3E5444)
- Dark teal (#12292F)
- Beige de fondo (#E7E4DE)
- Terracota (#B8604D)

## 📁 Estructura Principal

```
/appointments     - Gestión de citas médicas
/patients        - Gestión de pacientes
/breathe-move    - Clases de Breathe & Move
/memberships     - Membresías y paquetes
/payments        - Gestión de pagos
/reports         - Reportes y análisis
/settings        - Configuración del sistema
```

## 🔐 Acceso al Dashboard

Usa las mismas credenciales de administrador que tienes en Supabase.

## 🛠️ Características Principales

1. **Gestión de Citas**
   - Ver todas las citas
   - Crear nuevas citas
   - Modificar y cancelar citas
   - Filtrar por servicio y profesional

2. **Gestión de Pacientes**
   - Lista completa de pacientes
   - Perfil detallado de cada paciente
   - Historial de citas
   - Créditos y pagos

3. **Breathe & Move**
   - Calendario de clases
   - Gestión de inscripciones
   - Control de cupos

4. **Reportes**
   - Análisis de ingresos
   - Ocupación por servicio
   - Métricas de pacientes

## 🔧 Configuración Adicional

El archivo `.env.local` ya está configurado con:
- URLs de Supabase
- Claves de API
- Configuración de pagos PayU

## 📱 Sincronización con App Móvil

Todos los cambios realizados en el dashboard se reflejan inmediatamente en la app móvil:
- Nuevas citas aparecen en la app
- Cambios en clases de Breathe & Move
- Actualizaciones de perfil de pacientes

## 🆘 Solución de Problemas

Si el proyecto no inicia:
1. Asegúrate de tener Node.js instalado (versión 18 o superior)
2. Elimina `node_modules` y `package-lock.json`
3. Ejecuta `npm install` nuevamente

## 🎯 Próximos Pasos

1. Ejecutar el proyecto
2. Iniciar sesión como administrador
3. Explorar las diferentes secciones
4. Personalizar según necesidades específicas

¿Necesitas ayuda adicional? Todo está listo para empezar a usar el dashboard.