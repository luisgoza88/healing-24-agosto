import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/src/lib/supabase'

interface PatientFilters {
  searchTerm?: string
  page?: number
}

interface PatientResult {
  patients: any[]
  totalPages: number
  currentPage: number
  totalCount: number
}

export function usePatients(filters: PatientFilters = {}) {
  const supabase = createClient()
  const itemsPerPage = 50
  
  return useQuery<PatientResult>({
    queryKey: ['patients', filters],
    queryFn: async (): Promise<PatientResult> => {
      console.log('Fetching patients with filters:', filters)
      
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

      console.log('Query result:', { 
        dataLength: data?.length, 
        count, 
        error,
        firstItems: data?.slice(0, 3).map(p => ({ id: p.id, email: p.email, name: p.full_name }))
      })

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
    placeholderData: (previousData) => previousData,
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
      // Primero intentar con la función SQL que no envía emails
      if (patientData.email) {
        const { data: sqlResult, error: sqlError } = await supabase.rpc(
          'create_user_without_email_confirmation',
          {
            user_email: patientData.email,
            user_password: patientData.password || 'salud',
            user_metadata: {
              full_name: patientData.full_name,
              phone: patientData.phone,
              created_by_admin: true
            }
          }
        )

        if (sqlError) {
          console.error('SQL function error:', sqlError)
          // Si falla, intentar con la API route
          const response = await fetch('/api/admin/create-patient', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(patientData)
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Error al crear paciente')
          }

          return data.user
        }

        if (!sqlResult.success) {
          throw new Error(sqlResult.error || 'Error al crear usuario')
        }

        // Actualizar el perfil con los datos adicionales
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: patientData.full_name,
            phone: patientData.phone,
            date_of_birth: patientData.date_of_birth || null,
            gender: patientData.gender || null,
            address: patientData.address || null,
            city: patientData.city || null,
            emergency_contact_name: patientData.emergency_contact_name || null,
            emergency_contact_phone: patientData.emergency_contact_phone || null,
            medical_conditions: patientData.medical_conditions || null,
            allergies: patientData.allergies || null,
            bio: patientData.bio || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', sqlResult.user_id)

        if (updateError) {
          console.error('Error updating profile:', updateError)
        }

        return { id: sqlResult.user_id, email: sqlResult.email }
      }

      // Si no hay email, crear solo el perfil
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          full_name: patientData.full_name,
          email: patientData.email,
          phone: patientData.phone || null,
          date_of_birth: patientData.date_of_birth || null,
          gender: patientData.gender || null,
          address: patientData.address || null,
          city: patientData.city || null,
          emergency_contact_name: patientData.emergency_contact_name || null,
          emergency_contact_phone: patientData.emergency_contact_phone || null,
          medical_conditions: patientData.medical_conditions || null,
          allergies: patientData.allergies || null,
          bio: patientData.bio || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patientStats'] })
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
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient'] }) // Detalle individual
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