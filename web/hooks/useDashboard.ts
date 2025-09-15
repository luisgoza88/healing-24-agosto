import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/src/lib/supabase'

interface DashboardStats {
  todayAppointments: number
  totalPatients: number
  todayRevenue: number
  monthlyRevenue: number
  recentActivity: {
    id: string
    type: string
    description: string
    timestamp: string
  }[]
  todayAppointmentsList: {
    id: string
    time: string
    patientName: string
    professionalName: string
    serviceName: string
    status: string
  }[]
}

export function useDashboardStats() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

      // Ejecutar todas las consultas en paralelo
      const [
        todayAppointmentsResult,
        totalPatientsResult,
        todayRevenue,
        monthlyRevenue,
        todayAppointmentsList,
        recentPayments,
        recentAppointments
      ] = await Promise.all([
        // Citas de hoy
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', todayStr)
          .neq('status', 'cancelled'),
        
        // Total de pacientes
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        
        // Ingresos del día (usando appointments con payment_status)
        supabase
          .from('appointments')
          .select('total_amount')
          .eq('appointment_date', todayStr)
          .eq('payment_status', 'paid'),
        
        // Ingresos del mes
        supabase
          .from('appointments')
          .select('total_amount')
          .gte('appointment_date', firstDayOfMonth)
          .eq('payment_status', 'paid'),
        
        // Lista de citas de hoy con detalles
        supabase
          .from('appointments')
          .select(`
            id,
            appointment_time,
            status,
            profiles!appointments_user_id_fkey (full_name),
            professionals (full_name),
            services (name)
          `)
          .eq('appointment_date', todayStr)
          .neq('status', 'cancelled')
          .order('appointment_time')
          .limit(10),
        
        // Pagos recientes para actividad
        supabase
          .from('appointments')
          .select(`
            id,
            created_at,
            total_amount,
            payment_status,
            profiles!appointments_user_id_fkey (full_name)
          `)
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Citas recientes para actividad
        supabase
          .from('appointments')
          .select(`
            id,
            created_at,
            status,
            profiles!appointments_user_id_fkey (full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      // Calcular totales de ingresos
      const todayRevenueAmount = todayRevenue.data?.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0
      const monthlyRevenueAmount = monthlyRevenue.data?.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0

      // Formatear lista de citas de hoy
      const formattedTodayAppointments = todayAppointmentsList.data?.map(apt => ({
        id: apt.id,
        time: apt.appointment_time,
        patientName: (apt.profiles as any)?.full_name || 'Paciente',
        professionalName: (apt.professionals as any)?.full_name || 'No asignado',
        serviceName: (apt.services as any)?.name || 'Servicio general',
        status: apt.status
      })) || []

      // Combinar actividad reciente
      const recentActivity: any[] = []
      
      // Agregar pagos recientes
      recentPayments.data?.forEach(payment => {
        recentActivity.push({
          id: payment.id,
          type: 'payment',
          description: `Pago recibido de ${(payment.profiles as any)?.full_name || 'Paciente'} - ${new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
          }).format(payment.total_amount || 0)}`,
          timestamp: payment.created_at
        })
      })

      // Agregar citas recientes
      recentAppointments.data?.forEach(appointment => {
        const statusText = appointment.status === 'confirmed' ? 'confirmada' : 
                          appointment.status === 'completed' ? 'completada' : 
                          appointment.status === 'cancelled' ? 'cancelada' : 'pendiente'
        recentActivity.push({
          id: appointment.id,
          type: 'appointment',
          description: `Cita ${statusText} - ${(appointment.profiles as any)?.full_name || 'Paciente'}`,
          timestamp: appointment.created_at
        })
      })

      // Ordenar actividad por timestamp
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      return {
        todayAppointments: todayAppointmentsResult.count || 0,
        totalPatients: totalPatientsResult.count || 0,
        todayRevenue: todayRevenueAmount,
        monthlyRevenue: monthlyRevenueAmount,
        todayAppointmentsList: formattedTodayAppointments,
        recentActivity: recentActivity.slice(0, 10)
      }
    },
    staleTime: 2 * 60 * 1000, // Cache de 2 minutos para el dashboard
    refetchInterval: 5 * 60 * 1000, // Actualizar cada 5 minutos
  })
}

// Hook para gráficos del dashboard
export function useDashboardCharts() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['dashboardCharts'],
    queryFn: async () => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      // Obtener citas de los últimos 7 días
      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_date, status, total_amount, payment_status')
        .gte('appointment_date', sevenDaysAgo.toISOString())
        .order('appointment_date')

      // Agrupar por día
      const dailyStats: Record<string, { appointments: number, revenue: number }> = {}
      
      // Inicializar todos los días
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        dailyStats[dateStr] = { appointments: 0, revenue: 0 }
      }

      // Llenar con datos reales
      appointments?.forEach(apt => {
        const dateStr = apt.appointment_date
        if (dailyStats[dateStr]) {
          if (apt.status !== 'cancelled') {
            dailyStats[dateStr].appointments++
          }
          if (apt.payment_status === 'paid') {
            dailyStats[dateStr].revenue += apt.total_amount || 0
          }
        }
      })

      // Convertir a formato para gráficos
      const chartData = Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date,
          dayName: new Date(date).toLocaleDateString('es-ES', { weekday: 'short' }),
          appointments: stats.appointments,
          revenue: stats.revenue
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return chartData
    },
    staleTime: 5 * 60 * 1000, // Cache de 5 minutos
  })
}