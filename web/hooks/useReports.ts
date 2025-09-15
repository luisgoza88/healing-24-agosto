import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/src/lib/supabase'

// Hook para estadísticas generales del dashboard de reportes
export function useReportsDashboard() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['reportsDashboard'],
    queryFn: async () => {
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

      // Ejecutar todas las consultas en paralelo
      const [
        totalRevenue,
        monthlyRevenue,
        lastMonthRevenue,
        totalAppointments,
        monthlyAppointments,
        completedAppointments,
        totalPatients,
        activePatients
      ] = await Promise.all([
        // Ingresos totales
        supabase
          .from('appointments')
          .select('total_amount')
          .eq('payment_status', 'paid'),
        
        // Ingresos del mes actual
        supabase
          .from('appointments')
          .select('total_amount')
          .eq('payment_status', 'paid')
          .gte('appointment_date', firstDayOfMonth.toISOString()),
        
        // Ingresos del mes pasado
        supabase
          .from('appointments')
          .select('total_amount')
          .eq('payment_status', 'paid')
          .gte('appointment_date', firstDayOfLastMonth.toISOString())
          .lte('appointment_date', lastDayOfLastMonth.toISOString()),
        
        // Total de citas
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true }),
        
        // Citas del mes
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', firstDayOfMonth.toISOString()),
        
        // Citas completadas
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),
        
        // Total pacientes
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        
        // Pacientes activos (con citas este mes)
        supabase
          .from('appointments')
          .select('user_id')
          .gte('appointment_date', firstDayOfMonth.toISOString())
          .neq('status', 'cancelled')
      ])

      // Calcular totales
      const totalRevenueAmount = totalRevenue.data?.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0
      const monthlyRevenueAmount = monthlyRevenue.data?.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0
      const lastMonthRevenueAmount = lastMonthRevenue.data?.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0
      
      // Calcular cambio porcentual
      const revenueChange = lastMonthRevenueAmount > 0 
        ? ((monthlyRevenueAmount - lastMonthRevenueAmount) / lastMonthRevenueAmount) * 100 
        : 0

      // Contar pacientes únicos activos
      const uniqueActivePatients = new Set(activePatients.data?.map(a => a.user_id) || []).size

      return {
        totalRevenue: totalRevenueAmount,
        monthlyRevenue: monthlyRevenueAmount,
        revenueChange,
        totalAppointments: totalAppointments.count || 0,
        monthlyAppointments: monthlyAppointments.count || 0,
        completedAppointments: completedAppointments.count || 0,
        totalPatients: totalPatients.count || 0,
        activePatients: uniqueActivePatients,
        completionRate: totalAppointments.count 
          ? ((completedAppointments.count || 0) / totalAppointments.count) * 100 
          : 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// Hook para reporte de ingresos
export function useRevenueReport(dateRange?: { from: Date; to: Date }) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['revenueReport', dateRange],
    queryFn: async () => {
      const from = dateRange?.from || new Date(new Date().setDate(1))
      const to = dateRange?.to || new Date()

      // Obtener citas pagadas en el rango
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          appointment_date,
          total_amount,
          professional_id,
          service_id,
          professionals (full_name),
          services (name)
        `)
        .eq('payment_status', 'paid')
        .gte('appointment_date', from.toISOString())
        .lte('appointment_date', to.toISOString())

      if (!appointments) return null

      // Agrupar por día para el gráfico
      const dailyRevenue = appointments.reduce((acc, apt) => {
        const date = apt.appointment_date
        acc[date] = (acc[date] || 0) + (apt.total_amount || 0)
        return acc
      }, {} as Record<string, number>)

      // Agrupar por profesional
      const revenueByProfessional = appointments.reduce((acc, apt) => {
        const name = (apt.professionals as any)?.full_name || 'No asignado'
        acc[name] = (acc[name] || 0) + (apt.total_amount || 0)
        return acc
      }, {} as Record<string, number>)

      // Agrupar por servicio
      const revenueByService = appointments.reduce((acc, apt) => {
        const service = (apt.services as any)?.name || 'Servicio general'
        acc[service] = (acc[service] || 0) + (apt.total_amount || 0)
        return acc
      }, {} as Record<string, number>)

      // Convertir a formato para gráficos
      const chartData = Object.entries(dailyRevenue)
        .map(([date, amount]) => ({
          date,
          amount,
          formattedDate: new Date(date).toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short' 
          })
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const professionalData = Object.entries(revenueByProfessional)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10) // Top 10

      const serviceData = Object.entries(revenueByService)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)

      const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.total_amount || 0), 0)
      const averageTicket = appointments.length > 0 ? totalRevenue / appointments.length : 0

      return {
        totalRevenue,
        appointmentCount: appointments.length,
        averageTicket,
        chartData,
        professionalData,
        serviceData
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para reporte de citas
export function useAppointmentsReport(dateRange?: { from: Date; to: Date }) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['appointmentsReport', dateRange],
    queryFn: async () => {
      const from = dateRange?.from || new Date(new Date().setDate(1))
      const to = dateRange?.to || new Date()

      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          professional_id,
          service_id,
          duration,
          professionals (full_name),
          services (name)
        `)
        .gte('appointment_date', from.toISOString())
        .lte('appointment_date', to.toISOString())

      if (!appointments) return null

      // Estadísticas por estado
      const statusStats = appointments.reduce((acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Citas por día de la semana
      const dayStats = appointments.reduce((acc, apt) => {
        const day = new Date(apt.appointment_date).getDay()
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        acc[dayNames[day]] = (acc[dayNames[day]] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Citas por hora
      const hourStats = appointments.reduce((acc, apt) => {
        const hour = parseInt(apt.appointment_time.split(':')[0])
        acc[`${hour}:00`] = (acc[`${hour}:00`] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Top profesionales por número de citas
      const professionalStats = appointments.reduce((acc, apt) => {
        const name = (apt.professionals as any)?.full_name || 'No asignado'
        acc[name] = (acc[name] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Top servicios
      const serviceStats = appointments.reduce((acc, apt) => {
        const service = (apt.services as any)?.name || 'Servicio general'
        acc[service] = (acc[service] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Tasa de ocupación (considerando 8 horas al día, 22 días laborables)
      const totalSlots = 22 * 8 * 2 // slots de 30 min
      const occupancyRate = (appointments.length / totalSlots) * 100

      return {
        total: appointments.length,
        statusStats,
        dayStats,
        hourStats,
        professionalStats: Object.entries(professionalStats)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        serviceStats: Object.entries(serviceStats)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        occupancyRate,
        completionRate: statusStats.completed 
          ? (statusStats.completed / appointments.length) * 100 
          : 0,
        cancellationRate: statusStats.cancelled 
          ? (statusStats.cancelled / appointments.length) * 100 
          : 0
      }
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Hook para reporte de pacientes
export function usePatientsReport() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['patientsReport'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const [
        profiles,
        recentAppointments,
        allAppointments
      ] = await Promise.all([
        // Todos los perfiles
        supabase
          .from('profiles')
          .select('id, created_at, date_of_birth, gender, city'),
        
        // Citas recientes para pacientes activos
        supabase
          .from('appointments')
          .select('user_id')
          .gte('appointment_date', thirtyDaysAgo.toISOString())
          .neq('status', 'cancelled'),
        
        // Todas las citas para análisis de retención
        supabase
          .from('appointments')
          .select('user_id, appointment_date, created_at')
          .gte('created_at', sixMonthsAgo.toISOString())
      ])

      if (!profiles.data) return null

      // Estadísticas de género
      const genderStats = profiles.data.reduce((acc, profile) => {
        const gender = profile.gender || 'No especificado'
        acc[gender] = (acc[gender] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Estadísticas de edad
      const ageGroups = { '0-17': 0, '18-30': 0, '31-45': 0, '46-60': 0, '60+': 0 }
      profiles.data.forEach(profile => {
        if (profile.date_of_birth) {
          const age = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
          if (age < 18) ageGroups['0-17']++
          else if (age <= 30) ageGroups['18-30']++
          else if (age <= 45) ageGroups['31-45']++
          else if (age <= 60) ageGroups['46-60']++
          else ageGroups['60+']++
        }
      })

      // Estadísticas de ciudad
      const cityStats = profiles.data.reduce((acc, profile) => {
        const city = profile.city || 'No especificada'
        acc[city] = (acc[city] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Nuevos pacientes por mes (últimos 6 meses)
      const monthlyNewPatients: Record<string, number> = {}
      profiles.data.forEach(profile => {
        const date = new Date(profile.created_at)
        if (date >= sixMonthsAgo) {
          const monthKey = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })
          monthlyNewPatients[monthKey] = (monthlyNewPatients[monthKey] || 0) + 1
        }
      })

      // Pacientes activos
      const activePatientIds = new Set(recentAppointments.data?.map(a => a.user_id) || [])
      
      // Tasa de retención (pacientes con más de una cita)
      const patientAppointmentCounts = allAppointments.data?.reduce((acc, apt) => {
        acc[apt.user_id] = (acc[apt.user_id] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
      
      const returningPatients = Object.values(patientAppointmentCounts).filter(count => count > 1).length
      const totalPatientsWithAppointments = Object.keys(patientAppointmentCounts).length

      return {
        total: profiles.data.length,
        active: activePatientIds.size,
        new: monthlyNewPatients,
        genderStats,
        ageGroups,
        cityStats: Object.entries(cityStats)
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        retentionRate: totalPatientsWithAppointments > 0 
          ? (returningPatients / totalPatientsWithAppointments) * 100 
          : 0,
        growthTrend: Object.entries(monthlyNewPatients)
          .map(([month, count]) => ({ month, count }))
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutos
  })
}