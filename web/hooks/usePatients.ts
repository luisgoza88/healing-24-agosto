import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/src/lib/supabase'

interface PatientFilters {
  searchTerm?: string
  page?: number
}

export function usePatients(filters: PatientFilters = {}) {
  const supabase = createClient()
  const itemsPerPage = 50
  
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Aplicar búsqueda
      if (filters.searchTerm) {
        query = query.or(`full_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%,phone.ilike.%${filters.searchTerm}%`)
      }

      // Paginación
      const page = filters.page || 1
      const from = (page - 1) * itemsPerPage
      const to = page * itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      return {
        patients: data || [],
        totalPages: Math.ceil((count || 0) / itemsPerPage),
        currentPage: page,
        totalCount: count || 0
      }
    },
    // Caché de 10 minutos para pacientes
    staleTime: 10 * 60 * 1000,
    keepPreviousData: true,
  })
}

export function usePatientStats() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['patientStats'],
    queryFn: async () => {
      const today = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(today.getDate() - 30)

      const [totalResult, newResult, activeResult] = await Promise.all([
        // Total de pacientes
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        
        // Nuevos este mes
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),
        
        // Activos (con citas en los últimos 30 días)
        supabase
          .from('appointments')
          .select('user_id', { count: 'exact' })
          .gte('appointment_date', thirtyDaysAgo.toISOString())
          .neq('status', 'cancelled')
      ])

      // Contar usuarios únicos activos
      const uniqueActiveUsers = new Set(activeResult.data?.map(a => a.user_id) || [])

      return {
        total: totalResult.count || 0,
        newThisMonth: newResult.count || 0,
        active: uniqueActiveUsers.size
      }
    },
    // Estadísticas se actualizan cada 5 minutos
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (patientData: any) => {
      // Primero crear el usuario en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: patientData.email,
        password: patientData.phone, // Usar teléfono como contraseña temporal
        options: {
          data: {
            full_name: patientData.full_name,
            phone: patientData.phone,
          }
        }
      })

      if (authError) throw authError

      // Luego actualizar el perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: patientData.full_name,
          phone: patientData.phone,
          date_of_birth: patientData.date_of_birth,
          gender: patientData.gender,
          address: patientData.address,
          emergency_contact_name: patientData.emergency_contact_name,
          emergency_contact_phone: patientData.emergency_contact_phone,
          medical_history: patientData.medical_history,
          allergies: patientData.allergies,
          current_medications: patientData.current_medications,
        })
        .eq('id', authData.user?.id)

      if (profileError) throw profileError

      return authData.user
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries(['patients'])
      queryClient.invalidateQueries(['patientStats'])
    },
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...patientData }: any) => {
      const { error } = await supabase
        .from('profiles')
        .update(patientData)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['patients'])
      queryClient.invalidateQueries(['patient']) // Detalle individual
    },
  })
}

export function usePatientDetail(patientId: string) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single()

      if (error) throw error
      return data
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!patientId,
  })
}

export function usePatientAppointments(patientId: string) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['patientAppointments', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          professionals (full_name),
          services (name)
        `)
        .eq('user_id', patientId)
        .order('appointment_date', { ascending: false })
        .limit(20)

      if (error) throw error

      return data?.map(apt => ({
        ...apt,
        professional_name: apt.professionals?.full_name || 'No asignado',
        service_name: apt.services?.name || 'Servicio general'
      })) || []
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!patientId,
  })
}