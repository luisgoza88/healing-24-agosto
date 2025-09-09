# Panel Administrativo - Healing Forest

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- Cuenta de Supabase con acceso al proyecto

### Instalación
```bash
# Desde la raíz del proyecto
cd web
npm install
```

### Configuración
1. Copia el archivo `.env.local.example` a `.env.local`
2. Añade tu clave anon de Supabase

### Desarrollo
```bash
# Desde la raíz del proyecto
npm run admin

# O para correr todo el ecosistema
npm run dev:all
```

El panel estará disponible en http://localhost:3000

## 📁 Estructura

```
web/
├── app/                    # Páginas y rutas
│   ├── dashboard/         # Panel principal
│   ├── appointments/      # Gestión de citas
│   ├── users/            # Gestión de pacientes
│   └── professionals/    # Gestión de profesionales
├── src/
│   ├── components/       # Componentes reutilizables
│   ├── lib/             # Configuración (Supabase, etc)
│   ├── hooks/           # Custom hooks
│   └── utils/           # Utilidades
└── public/              # Archivos estáticos
```

## 🔐 Autenticación

El panel usa Supabase Auth. Solo usuarios con rol de administrador pueden acceder.

## 🎯 Funcionalidades

### Dashboard Principal
- Métricas en tiempo real
- Resumen de citas del día
- Ingresos y estadísticas

### Gestión de Citas
- Ver todas las citas
- Filtrar por fecha, profesional, estado
- Cancelar/Reagendar citas
- Ver detalles del paciente

### Gestión de Pacientes
- Lista completa de pacientes
- Historial de citas
- Información de contacto
- Notas médicas

### Gestión de Profesionales
- Horarios y disponibilidad
- Bloqueo de agenda
- Estadísticas de desempeño

## 🛠️ Tecnologías

- **Next.js 14** - Framework React
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilos
- **Supabase** - Base de datos y auth
- **Lucide React** - Iconos
- **Recharts** - Gráficas

## 📱 Responsive

El panel está optimizado para desktop pero es completamente funcional en tablets y móviles.