# 📋 Plan de Desarrollo - Dashboard Administrativo Healing Forest

## 🎯 Objetivos Principales
- Dashboard moderno con tecnología de última generación
- Sincronización en tiempo real con la app móvil
- Interfaz intuitiva con drag & drop para gestión de citas
- Sistema completo de gestión para clínica/spa

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Framework**: Next.js 15 con App Router
- **Base de Datos**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui + Tailwind CSS
- **Estado Global**: Zustand
- **Drag & Drop**: @dnd-kit/sortable
- **Calendario**: FullCalendar con recursos múltiples
- **Gráficos**: Recharts
- **Notificaciones**: React Hot Toast
- **Tablas**: TanStack Table (React Table v8)
- **Formularios**: React Hook Form + Zod

## 📦 Módulos a Desarrollar

### 1. 👥 Gestión de Pacientes
**Funcionalidades**:
- ✅ Vista de tabla con búsqueda, filtros y paginación
- ✅ Perfil detallado de cada paciente
- ✅ Historial médico y alergias
- ✅ Historial de citas y pagos
- ✅ Balance de créditos
- ✅ Documentos y archivos adjuntos
- ✅ Notas internas
- ✅ Exportación a Excel/PDF

**Tecnologías**: TanStack Table, shadcn/ui Dialog, React Hook Form

### 2. 📅 Gestión de Citas (Calendar View)
**Funcionalidades**:
- ✅ Vista de calendario con múltiples recursos (profesionales)
- ✅ Drag & drop para mover citas
- ✅ Click para crear nueva cita
- ✅ Vista por día/semana/mes
- ✅ Filtros por servicio/profesional
- ✅ Estados visuales (confirmada, pendiente, cancelada)
- ✅ Recordatorios automáticos
- ✅ Gestión de conflictos de horarios

**Tecnologías**: FullCalendar, @dnd-kit/sortable, date-fns

### 3. 📦 Gestión de Paquetes y Membresías
**Funcionalidades**:
- ✅ CRUD de tipos de paquetes
- ✅ Configuración de precios y descuentos
- ✅ Gestión de vigencias
- ✅ Asignación a pacientes
- ✅ Tracking de uso
- ✅ Renovaciones automáticas
- ✅ Reportes de ventas

**Tecnologías**: shadcn/ui Cards, Recharts

### 4. 🧘 Breathe & Move (Clases Grupales)
**Funcionalidades**:
- ✅ Calendario de clases
- ✅ Gestión de cupos
- ✅ Lista de espera automática
- ✅ Check-in de asistentes
- ✅ Métricas de ocupación
- ✅ Gestión de instructores
- ✅ Clases recurrentes

**Tecnologías**: Calendar view personalizado, Real-time subscriptions

### 5. 💰 Gestión de Pagos
**Funcionalidades**:
- ✅ Dashboard de ingresos
- ✅ Registro de todos los pagos
- ✅ Estados de pago (pendiente, completado, fallido)
- ✅ Integración con PayU
- ✅ Generación de recibos
- ✅ Conciliación bancaria
- ✅ Reportes financieros

**Tecnologías**: Recharts, React PDF

### 6. 💳 Gestión de Créditos
**Funcionalidades**:
- ✅ Balance de créditos por paciente
- ✅ Historial de transacciones
- ✅ Ajustes manuales
- ✅ Políticas de expiración
- ✅ Alertas de saldo bajo
- ✅ Reportes de uso

**Tecnologías**: Zustand para estado, shadcn/ui DataTable

### 7. 📊 Dashboard Principal
**Funcionalidades**:
- ✅ KPIs principales (ingresos, citas, ocupación)
- ✅ Gráficos interactivos
- ✅ Alertas y notificaciones
- ✅ Accesos rápidos
- ✅ Tendencias
- ✅ Comparativas

**Tecnologías**: Recharts, Grid Layout

## 🔄 Sincronización con App Móvil

### Real-time Updates
- Supabase Realtime para sincronización instantánea
- Webhooks para notificaciones push
- Cache optimista para mejor UX

### Datos Compartidos
- Misma base de datos
- Mismos modelos de datos
- Validaciones consistentes

## 🎨 Diseño UI/UX

### Principios
- **Minimalista**: Interfaz limpia tipo Linear/Notion
- **Colores**: Paleta de Healing Forest
- **Responsive**: Funciona en desktop y tablet
- **Accesibilidad**: WCAG 2.1 AA

### Componentes Clave
- Sidebar colapsable
- Command palette (Cmd+K)
- Dark mode
- Breadcrumbs
- Loading states
- Empty states

## 📅 Fases de Desarrollo

### Fase 1: Configuración Base (1 semana)
- [ ] Setup de Supabase y autenticación
- [ ] Componentes base con shadcn/ui
- [ ] Layout principal
- [ ] Sistema de rutas

### Fase 2: Módulos Core (2-3 semanas)
- [ ] Gestión de Pacientes
- [ ] Gestión de Citas
- [ ] Calendario con drag & drop

### Fase 3: Módulos Avanzados (2-3 semanas)
- [ ] Paquetes y Membresías
- [ ] Breathe & Move
- [ ] Sistema de Créditos

### Fase 4: Finanzas y Reportes (1-2 semanas)
- [ ] Módulo de Pagos
- [ ] Dashboard analítico
- [ ] Reportes exportables

### Fase 5: Optimización (1 semana)
- [ ] Performance
- [ ] Testing
- [ ] Documentación

## 🚀 Características Especiales

### Drag & Drop
- Mover citas entre horarios y profesionales
- Reorganizar clases
- Gestión visual intuitiva

### Búsqueda Global
- Command palette estilo Notion
- Búsqueda fuzzy
- Accesos rápidos

### Notificaciones
- Toast notifications
- Email automáticos
- Recordatorios

### Exportación
- Excel para datos
- PDF para reportes
- Calendario .ics

## 🔧 Configuración Inicial Necesaria

1. **Instalar dependencias principales**:
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-table @tanstack/react-query
npm install recharts date-fns
npm install react-hook-form zod @hookform/resolvers
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install zustand immer
npm install react-hot-toast
```

2. **Instalar shadcn/ui**:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog table form
```

3. **Configurar Supabase Client con tipos**

4. **Crear hooks personalizados para cada módulo**

5. **Implementar sistema de permisos y roles**

## 📝 Próximos Pasos

1. ¿Quieres empezar con la configuración base?
2. ¿Prefieres comenzar con algún módulo específico?
3. ¿Hay alguna funcionalidad adicional que necesites?

Este plan te dará un dashboard profesional nivel enterprise, similar a Linear, Notion o Monday.com, pero personalizado para las necesidades específicas de Healing Forest.