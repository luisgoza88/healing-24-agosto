# Arquitectura Estándar - Panel Administrativo Healing Forest

## 🏗️ Stack Tecnológico

- **Framework**: Next.js 15.5.2 (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos**: Supabase
- **Gestión de Estado**: React Query (TanStack Query)
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React

## 📋 Estándares de Desarrollo

### 1. Gestión de Datos con React Query

**OBLIGATORIO**: Todas las páginas que consuman datos DEBEN usar React Query.

#### ❌ NO HACER:
```typescript
// Método antiguo - NO USAR
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchData()
}, [])

const fetchData = async () => {
  const { data } = await supabase.from('table').select()
  setData(data)
  setLoading(false)
}
```

#### ✅ HACER:
```typescript
// Método correcto - USAR SIEMPRE
import { useQuery } from '@tanstack/react-query'

const { data, isLoading, error } = useQuery({
  queryKey: ['uniqueKey', filters],
  queryFn: async () => {
    const { data, error } = await supabase.from('table').select()
    if (error) throw error
    return data
  }
})
```

### 2. Estructura de Hooks Personalizados

Crear hooks personalizados en `/hooks/` para cada entidad:

```typescript
// hooks/useEntidad.ts
export function useEntidades(filters?: any) {
  return useQuery({
    queryKey: ['entidades', filters],
    queryFn: async () => {
      // Lógica de consulta
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

export function useUpdateEntidad() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data) => {
      // Lógica de actualización
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['entidades'])
    }
  })
}
```

### 3. Tiempos de Caché Estándar

- **Datos que cambian frecuentemente** (citas, transacciones): 5 minutos
- **Datos semi-estáticos** (pacientes): 10 minutos  
- **Datos estáticos** (profesionales, servicios): 30 minutos
- **Configuración/catálogos**: 1 hora

### 4. Optimizaciones Obligatorias

#### Paginación
- Límite de 50 items para vistas administrativas
- Usar `range()` de Supabase
- Implementar controles de paginación

#### Debounce en Búsquedas
```typescript
import { useDebounce } from '@/hooks/useDebounce'

const debouncedSearchTerm = useDebounce(searchTerm, 300)
```

#### Prefetching
Para listas paginadas, prefetch la siguiente página:
```typescript
const prefetchNextPage = usePrefetchNextPage(filters, currentPage)

useEffect(() => {
  if (currentPage < totalPages && !isLoading) {
    prefetchNextPage()
  }
}, [currentPage, totalPages])
```

### 5. Manejo de Estados

#### Estados de Carga
```typescript
if (isLoading) {
  return <LoadingSkeleton />
}
```

#### Estados de Error
```typescript
if (error) {
  return (
    <ErrorState 
      message="Error al cargar datos" 
      onRetry={() => refetch()} 
    />
  )
}
```

#### Estados Vacíos
```typescript
if (data?.length === 0) {
  return <EmptyState message="No se encontraron resultados" />
}
```

### 6. Componentes Reutilizables

Crear componentes comunes en `/components/`:
- `LoadingSkeleton` - Para estados de carga
- `ErrorState` - Para errores
- `EmptyState` - Para listas vacías
- `Pagination` - Para controles de paginación

### 7. Estructura de Carpetas

```
/web
  /app
    /dashboard
      /[seccion]
        page.tsx          # Vista principal con React Query
        /[id]
          page.tsx        # Vista detalle
          /edit
            page.tsx      # Vista edición
        /new
          page.tsx        # Vista creación
  /hooks
    use[Entidad].ts       # Hook React Query para entidad
    useDebounce.ts        # Hook de debounce
    useCachedData.ts      # Hooks para datos cacheados
  /components
    [Componente].tsx      # Componentes reutilizables
  /providers
    query-provider.tsx    # Provider de React Query
```

### 8. Checklist para Nueva Página

- [ ] Usar React Query para todas las consultas
- [ ] Crear hook personalizado en `/hooks/`
- [ ] Implementar paginación si hay listas
- [ ] Añadir debounce en búsquedas
- [ ] Manejar estados: loading, error, empty
- [ ] Usar componentes de skeleton para loading
- [ ] Implementar prefetch si aplica
- [ ] Seguir tiempos de caché estándar

### 9. Ejemplo Completo de Página

```typescript
'use client'

import { useState } from 'react'
import { useEntidades, useUpdateEntidad } from '@/hooks/useEntidades'
import { useDebounce } from '@/hooks/useDebounce'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'

export default function EntidadesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  const { data, isLoading, error, refetch } = useEntidades({
    search: debouncedSearchTerm,
    page: currentPage
  })
  
  const updateMutation = useUpdateEntidad()
  
  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState onRetry={refetch} />
  if (!data?.length) return <EmptyState />
  
  return (
    // Contenido de la página
  )
}
```

## 🚀 Beneficios de esta Arquitectura

1. **Rendimiento**: Caché inteligente reduce consultas
2. **UX Mejorada**: Estados de carga y prefetch
3. **Mantenibilidad**: Código consistente y predecible
4. **Escalabilidad**: Fácil añadir nuevas funcionalidades
5. **Optimización**: Menos carga en Supabase

## ⚠️ Importante

Este documento es la **ÚNICA FUENTE DE VERDAD** para el desarrollo del panel administrativo. Todo código nuevo DEBE seguir estos estándares sin excepción.