# Instrucciones para Configurar el Dashboard de Healing Forest

## 1. Instalación de Dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
cd /Users/marianatejada/Documents/GitHub/healing-24-agosto/healing-forest-dashboard
npm install
```

## 2. Ejecutar el Proyecto

Una vez instaladas las dependencias, ejecuta:

```bash
npm run dev
```

El dashboard estará disponible en: http://localhost:3000

## 3. Credenciales de Acceso

El dashboard está conectado a tu base de datos de Supabase existente. Puedes usar las mismas credenciales que en la app móvil.

## 4. Estructura del Dashboard

- `/appointments` - Gestión de citas
- `/patients` - Gestión de pacientes
- `/breathe-move` - Clases de Breathe & Move
- `/payments` - Gestión de pagos
- `/reports` - Reportes y análisis

## 5. Configuración de Supabase

Ya está configurado para usar tu proyecto de Supabase existente:
- URL: https://vgwyhegpymqbljqtskra.supabase.co
- Las tablas y datos son los mismos que usa tu app móvil

## 6. Personalización para Healing Forest

El dashboard ya incluye:
- Diseño profesional con Tailwind CSS
- Integración con Supabase
- Sistema de autenticación
- Gestión de citas y pacientes

## Próximos Pasos

1. Ejecuta `npm install` y luego `npm run dev`
2. Accede a http://localhost:3000
3. Inicia sesión con tus credenciales de administrador
4. Explora las diferentes secciones del dashboard

¿Necesitas ayuda? El dashboard está listo para personalizar con los colores y branding de Healing Forest.