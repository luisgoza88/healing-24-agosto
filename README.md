# Healing Forest - Ecosistema Completo

## 🌿 Descripción

Healing Forest es un ecosistema digital completo para gestión de clínica de medicina funcional y wellness, que incluye:

- 📱 **App Móvil** (React Native + Expo) - Para pacientes
- 💻 **Panel Administrativo Web** (Next.js) - Para administración
- 🗄️ **Backend** (Supabase) - Base de datos y autenticación

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- Expo CLI
- Cuenta de Supabase

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/luisgoza88/healing-24-agosto.git
cd healing-24-agosto

# Instalar dependencias de la app móvil
npm install

# Instalar dependencias del panel web
cd web
npm install
cd ..
```

### Configuración

1. **App Móvil**: Crea un archivo `.env` en la raíz con tus credenciales de Supabase
2. **Panel Web**: Copia `web/.env.local.example` a `web/.env.local` y añade tus credenciales

### Desarrollo

```bash
# Solo app móvil
npm start

# Solo panel administrativo
npm run admin

# Todo el ecosistema
npm run dev:all
```

## 📁 Estructura del Proyecto

```
healing-24-agosto/
├── src/                    # App móvil (React Native)
│   ├── components/         # Componentes reutilizables
│   ├── screens/           # Pantallas de la app
│   ├── navigation/        # Navegación
│   ├── utils/             # Utilidades
│   └── lib/               # Configuración Supabase
├── web/                    # Panel administrativo (Next.js)
│   ├── app/               # Rutas y páginas
│   ├── src/               # Código fuente
│   └── public/            # Archivos estáticos
├── shared/                 # Código compartido
│   ├── types/             # Tipos TypeScript
│   └── constants/         # Constantes compartidas
└── supabase/              # Migraciones y esquema DB
```

## 🛠️ Stack Tecnológico

### App Móvil
- React Native + Expo
- TypeScript
- React Navigation
- NativeWind (Tailwind CSS)
- Supabase Client

### Panel Web
- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase SSR
- Recharts

### Backend
- Supabase (PostgreSQL)
- Row Level Security
- Edge Functions
- Realtime subscriptions

## 🔐 Seguridad

- Autenticación con Supabase Auth
- RLS (Row Level Security) en todas las tablas
- Prevención de citas superpuestas
- Roles diferenciados (paciente/admin/profesional)

## 📱 Funcionalidades Principales

### App Móvil (Pacientes)
- ✅ Registro y login
- ✅ Reserva de citas médicas
- ✅ Clases de Breathe & Move
- ✅ Pagos simulados
- ✅ Historial de citas
- ✅ Notificaciones push

### Panel Web (Administración)
- 🚧 Dashboard con métricas
- 🚧 Gestión de citas
- 🚧 Gestión de pacientes
- 🚧 Gestión de profesionales
- 🚧 Reportes y analytics

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Proyecto privado - Todos los derechos reservados

## 🧑‍💻 Equipo

- Desarrollo: Luis Goza & Team
- UI/UX: Healing Forest Design Team
- Backend: Supabase + Custom Functions