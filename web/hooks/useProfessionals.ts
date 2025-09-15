import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/src/lib/supabase'

interface ProfessionalFilters {
  searchTerm?: string
  specialtyFilter?: string
  page?: number
}

interface ProfessionalResult {
  professionals: any[]
  totalPages: number
  currentPage: number
  totalCount: number
}

export function useProfessionals(filters: ProfessionalFilters = {}) {
  const supabase = createClient()
  const itemsPerPage = 50
  
  return useQuery<ProfessionalResult>({
    queryKey: ['professionals', filters],
    queryFn: async (): Promise<ProfessionalResult> => {
      let query = supabase
        .from('professionals')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Aplicar búsqueda
      if (filters.searchTerm) {
        query = query.or(`full_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%`)
      }

      // Filtro por especialidad
      if (filters.specialtyFilter && filters.specialtyFilter !== 'todos') {
        query = query.contains('specialties', [filters.specialtyFilter])
      }

      // Paginación
      const page = filters.page || 1
      const from = (page - 1) * itemsPerPage
      const to = page * itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      return {
        professionals: data || [],
        totalPages: Math.ceil((count || 0) / itemsPerPage),
        currentPage: page,
        totalCount: count || 0
      }
    },
    // Caché de 30 minutos para profesionales
    staleTime: 30 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  })
}

export function useProfessionalStats() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['professionalStats'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      const [totalResult, activeResult, todayResult] = await Promise.all([
        // Total de profesionales
        supabase
          .from('professionals')
          .select('*', { count: 'exact', head: true })
          .eq('active', true),
        
        // Profesionales activos (con citas este mes)
        supabase
          .from('appointments')
          .select('professional_id', { count: 'exact' })
          .gte('appointment_date', new Date(today.getFullYear(), today.getMonth(), 1).toISOString())
          .neq('status', 'cancelled'),
        
        // Citas de hoy
        supabase
          .from('appointments')
          .select('professional_id', { count: 'exact' })
          .eq('appointment_date', todayStr)
          .neq('status', 'cancelled')
      ])

      // Contar profesionales únicos activos
      const uniqueActiveProfessionals = new Set(activeResult.data?.map(a => a.professional_id) || [])

      return {
        total: totalResult.count || 0,
        active: uniqueActiveProfessionals.size,
        withAppointmentsToday: todayResult.count || 0
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useProfessionalRevenue() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['professionalRevenue'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: appointments } = await supabase
        .from('appointments')
        .select('professional_id, total_amount')
        .gte('appointment_date', thirtyDaysAgo.toISOString())
        .eq('status', 'completed')
        .eq('payment_status', 'paid')

      // Calcular ingresos por profesional
      const revenueByProfessional = appointments?.reduce((acc, apt) => {
        if (apt.professional_id) {
          acc[apt.professional_id] = (acc[apt.professional_id] || 0) + (apt.total_amount || 0)
        }
        return acc
      }, {} as Record<string, number>) || {}

      // Obtener nombres de profesionales
      const professionalIds = Object.keys(revenueByProfessional)
      const { data: professionals } = await supabase
        .from('professionals')
        .select('id, full_name')
        .in('id', professionalIds)

      const topProfessionals = professionals?.map(prof => ({
        id: prof.id,
        name: prof.full_name,
        revenue: revenueByProfessional[prof.id] || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5) || []

      return topProfessionals
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateProfessional() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (professionalData: any) => {
      const { error } = await supabase
        .from('professionals')
        .insert([professionalData])

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['professionalStats'] })
    },
  })
}

export function useUpdateProfessional() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...professionalData }: any) => {
      const { error } = await supabase
        .from('professionals')
        .update(professionalData)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['professional'] })
    },
  })
}

export function useProfessionalDetail(professionalId: string) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['professional', professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', professionalId)
        .single()

      if (error) throw error
      return data
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!professionalId,
  })
}

export function useProfessionalSchedule(professionalId: string) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['professionalSchedule', professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_schedules')
        .select('*')
        .eq('professional_id', professionalId)
        .order('day_of_week')

      if (error) throw error
      return data || []
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!professionalId,
  })
}

export function useProfessionalAppointments(professionalId: string) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['professionalAppointments', professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!appointments_user_id_fkey (full_name, email),
          services (name)
        `)
        .eq('professional_id', professionalId)
        .order('appointment_date', { ascending: false })
        .limit(50)

      if (error) throw error

      return data?.map(apt => ({
        ...apt,
        patient_name: apt.profiles?.full_name || 'Paciente',
        patient_email: apt.profiles?.email || '',
        service_name: apt.services?.name || 'Servicio general'
      })) || []
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!professionalId,
  })
}