import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/src/lib/supabase'

interface AppointmentFilters {
  searchTerm?: string
  statusFilter?: string
  dateFilter?: string
  serviceFilter?: string
  page?: number
}

interface AppointmentResult {
  appointments: any[]
  totalPages: number
  currentPage: number
  totalCount: number
}

export function useAppointments(filters: AppointmentFilters = {}) {
  const supabase = createClient()
  const itemsPerPage = 50
  
  return useQuery<AppointmentResult>({
    queryKey: ['appointments', filters],
    queryFn: async (): Promise<AppointmentResult> => {
      // Mostrar citas de los últimos 90 días y todas las futuras
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      // Query base
      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          total_amount,
          payment_status,
          user_id,
          professional_id,
          service_id,
          notes,
          created_at
        `, { count: 'exact' })
        .gte('appointment_date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })

      // Aplicar filtros
      if (filters.statusFilter && filters.statusFilter !== 'todos') {
        query = query.eq('status', filters.statusFilter)
      }

      if (filters.dateFilter) {
        query = query.eq('appointment_date', filters.dateFilter)
      }

      // Paginación
      const page = filters.page || 1
      const from = (page - 1) * itemsPerPage
      const to = page * itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Si no hay datos, retornar vacío
      if (!data || data.length === 0) {
        return {
          appointments: [],
          totalPages: 0,
          currentPage: page,
          totalCount: 0
        }
      }

      // Obtener IDs únicos
      const professionalIds = [...new Set(data.map(apt => apt.professional_id).filter(Boolean))]
      const userIds = [...new Set(data.map(apt => apt.user_id).filter(Boolean))]
      const serviceIds = [...new Set(data.map(apt => apt.service_id).filter(Boolean))]

      // Cargar datos relacionados en paralelo
      const [professionalsRes, profilesRes, servicesRes] = await Promise.all([
        professionalIds.length > 0 
          ? supabase.from('professionals').select('id, full_name').in('id', professionalIds)
          : { data: [] },
        userIds.length > 0
          ? supabase.from('profiles').select('id, full_name, email').in('id', userIds)
          : { data: [] },
        serviceIds.length > 0
          ? supabase.from('services').select('id, name').in('id', serviceIds.filter(id => id !== null))
          : { data: [] }
      ])

      // Crear mapas para búsqueda rápida
      const professionalsMap = new Map(professionalsRes.data?.map(p => [p.id, p]) || [])
      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || [])
      const servicesMap = new Map(servicesRes.data?.map(s => [s.id, s]) || [])

      // Formatear datos
      const appointments = data.map(apt => {
        const professional = professionalsMap.get(apt.professional_id)
        const profile = profilesMap.get(apt.user_id)
        const service = servicesMap.get(apt.service_id)
        
        // Extraer el nombre de la clase de Breathe & Move de las notas
        let serviceName = service?.name || 'Servicio general'
        if (serviceName === 'Breathe & Move' && apt.notes) {
          // Buscar el nombre de la clase en las notas
          // Formato esperado: "Breathe & Move - NombreClase - ..."
          const match = apt.notes.match(/Breathe & Move\s*-\s*([^-]+)/i)
          if (match && match[1]) {
            const className = match[1].trim()
            // Mostrar como "B&M: NombreClase"
            serviceName = `B&M: ${className}`
          }
        }
        
        return {
          id: apt.id,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          service: serviceName,
          professional_id: apt.professional_id,
          professional_name: professional?.full_name || 'No asignado',
          user_id: apt.user_id,
          patient_name: profile?.full_name || 'Paciente',
          patient_email: profile?.email || '',
          status: apt.status,
          notes: apt.notes,
          total_amount: apt.total_amount || 0,
          payment_status: apt.payment_status,
          created_at: apt.created_at
        }
      })

      // Aplicar búsqueda en frontend si hay término
      let filteredAppointments = appointments
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        filteredAppointments = appointments.filter(apt =>
          apt.patient_name.toLowerCase().includes(term) ||
          apt.patient_email.toLowerCase().includes(term) ||
          apt.professional_name.toLowerCase().includes(term) ||
          apt.service.toLowerCase().includes(term) ||
          (apt.notes && apt.notes.toLowerCase().includes(term))
        )
      }

      // Aplicar filtro de servicio
      if (filters.serviceFilter && filters.serviceFilter !== 'todos') {
        filteredAppointments = filteredAppointments.filter(apt => {
          const serviceNameLower = apt.service.toLowerCase()
          
          switch (filters.serviceFilter) {
            case 'breathe-move':
              // Incluir todas las clases de Breathe & Move
              return serviceNameLower.includes('breathe') || serviceNameLower.includes('b&m:')
            case 'medicina-funcional':
              return serviceNameLower.includes('medicina funcional')
            case 'medicina-estetica':
              return serviceNameLower.includes('medicina estética')
            case 'wellness-integral':
              return serviceNameLower.includes('wellness')
            case 'masajes':
              return serviceNameLower.includes('masaje')
            case 'faciales':
              return serviceNameLower.includes('facial')
            case 'otros':
              // Otros servicios que no están en las categorías anteriores
              return !serviceNameLower.includes('breathe') && 
                     !serviceNameLower.includes('b&m:') &&
                     !serviceNameLower.includes('medicina funcional') &&
                     !serviceNameLower.includes('medicina estética') &&
                     !serviceNameLower.includes('wellness') &&
                     !serviceNameLower.includes('masaje') &&
                     !serviceNameLower.includes('facial')
            default:
              return true
          }
        })
      }

      return {
        appointments: filteredAppointments,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
        currentPage: page,
        totalCount: count || 0
      }
    },
    // Mantener datos previos mientras se cargan nuevos
    placeholderData: (previousData) => previousData,
  })
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string, status: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidar todas las consultas de appointments
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}