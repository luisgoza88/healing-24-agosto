import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/src/lib/supabase'

// Hook para profesionales con caché extendido
export function useProfessionals() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, full_name, specialties, active')
        .eq('active', true)
        .order('full_name')
      
      if (error) throw error
      return data || []
    },
    // Mantener en caché por 30 minutos
    staleTime: 30 * 60 * 1000,
    // Garbage collection después de 1 hora
    gcTime: 60 * 60 * 1000,
  })
}

// Hook para servicios con caché extendido
export function useServices() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, duration, active')
        .eq('active', true)
        .order('name')
      
      if (error) throw error
      return data || []
    },
    // Mantener en caché por 30 minutos
    staleTime: 30 * 60 * 1000,
    // Garbage collection después de 1 hora
    gcTime: 60 * 60 * 1000,
  })
}

// Hook para pacientes con caché moderado
export function usePatients() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .order('full_name')
        .limit(500) // Limitar para evitar cargar demasiados datos
      
      if (error) throw error
      return data || []
    },
    // Mantener en caché por 10 minutos
    staleTime: 10 * 60 * 1000,
    // Garbage collection después de 20 minutos
    gcTime: 20 * 60 * 1000,
  })
}