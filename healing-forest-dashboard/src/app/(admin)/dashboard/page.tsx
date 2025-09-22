"use client"

import React, { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Activity,
  TrendingUp,
  Clock,
  UserCheck,
  DollarSign
} from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { ServicesOccupancy } from '@/components/dashboard/ServicesOccupancy'
import { TodayAppointments } from '@/components/dashboard/TodayAppointments'
import { format, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from 'date-fns'

// Tipos
interface DashboardData {
  totalPatients: number
  totalPatientsChange: number
  todayAppointments: number
  todayAppointmentsChange: number
  monthRevenue: number
  monthRevenueChange: number
  activeCredits: number
  activeCreditsChange: number
  revenueData: any[]
  servicesOccupancy: any[]
  todayAppointmentsList: any[]
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData>({
    totalPatients: 0,
    totalPatientsChange: 0,
    todayAppointments: 0,
    todayAppointmentsChange: 0,
    monthRevenue: 0,
    monthRevenueChange: 0,
    activeCredits: 0,
    activeCreditsChange: 0,
    revenueData: [],
    servicesOccupancy: [],
    todayAppointmentsList: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    const supabase = getSupabaseBrowser()
    const today = new Date()
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)
    const last30Days = subDays(today, 30)

    try {
      // 1. Total de Pacientes
      const { count: totalPatients } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client')

      // 2. Citas de Hoy
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:user_id(full_name, first_name, last_name),
          services:service_id(name),
          professionals:professional_id(full_name)
        `)
        .eq('appointment_date', format(today, 'yyyy-MM-dd'))
        .order('appointment_time', { ascending: true })

      // 3. Ingresos del Mes
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      const monthRevenue = monthPayments?.reduce((sum, p) => sum + p.amount, 0) || 0

      // 4. Créditos Activos
      const { data: activeCredits } = await supabase
        .from('patient_credits')
        .select('available_credits')

      const totalCredits = activeCredits?.reduce((sum, c) => sum + c.available_credits, 0) || 0

      // 5. Datos para el gráfico de ingresos (últimos 30 días)
      const { data: revenueData } = await supabase
        .from('payments')
        .select(`
          amount,
          created_at,
          appointment_id,
          appointments:appointment_id!inner(service_id)
        `)
        .eq('status', 'completed')
        .gte('created_at', last30Days.toISOString())

      // Procesar datos para el gráfico
      const revenueByDay = processRevenueData(revenueData || [])

      // 6. Ocupación por servicio
      const { data: servicesData } = await supabase
        .from('services')
        .select(`
          id,
          name,
          color,
          appointments(
            id,
            appointment_date
          )
        `)
        .eq('active', true)

      const occupancyData = processOccupancyData(servicesData || [])

      // 7. Formatear citas de hoy
      const formattedAppointments = (todayAppointments || []).map(apt => ({
        id: apt.id,
        time: apt.appointment_time.slice(0, 5),
        patientName: apt.profiles?.first_name && apt.profiles?.last_name 
          ? `${apt.profiles.first_name} ${apt.profiles.last_name}`
          : apt.profiles?.full_name || 'Sin nombre',
        service: apt.services?.name || 'Servicio',
        professional: apt.professionals?.full_name || 'Profesional',
        status: apt.status
      }))

      setData({
        totalPatients: totalPatients || 0,
        totalPatientsChange: 12, // Placeholder - calcular vs mes anterior
        todayAppointments: todayAppointments?.length || 0,
        todayAppointmentsChange: 8,
        monthRevenue,
        monthRevenueChange: 15,
        activeCredits: totalCredits,
        activeCreditsChange: 5,
        revenueData: revenueByDay,
        servicesOccupancy: occupancyData,
        todayAppointmentsList: formattedAppointments
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Procesar datos de ingresos por día
  const processRevenueData = (payments: any[]) => {
    const dayMap = new Map()
    const today = new Date()
    
    // Inicializar últimos 30 días
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      dayMap.set(dateStr, { date: dateStr, servicios: 0, paquetes: 0, total: 0 })
    }

    // Agregar pagos a los días correspondientes
    payments.forEach(payment => {
      const dateStr = format(new Date(payment.created_at), 'yyyy-MM-dd')
      if (dayMap.has(dateStr)) {
        const day = dayMap.get(dateStr)
        // Aquí podrías diferenciar entre servicios y paquetes
        day.servicios += payment.amount
        day.total += payment.amount
        dayMap.set(dateStr, day)
      }
    })

    return Array.from(dayMap.values())
  }

  // Procesar datos de ocupación
  const processOccupancyData = (services: any[]) => {
    return services.map(service => {
      const totalSlots = 20 // Slots disponibles por semana (placeholder)
      const occupiedSlots = service.appointments?.filter((apt: any) => {
        const aptDate = new Date(apt.appointment_date)
        const weekStart = subDays(new Date(), 7)
        return aptDate >= weekStart
      }).length || 0

      return {
        name: service.name,
        ocupacion: Math.round((occupiedSlots / totalSlots) * 100),
        color: service.color || '#3E5444'
      }
    }).slice(0, 5) // Top 5 servicios
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bienvenido al centro de control de Healing Forest
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Pacientes"
          value={data.totalPatients}
          change={{ value: data.totalPatientsChange, type: 'increase' }}
          icon={Users}
          iconColor="text-blue-600"
          loading={loading}
        />
        <KPICard
          title="Citas Hoy"
          value={data.todayAppointments}
          change={{ value: data.todayAppointmentsChange, type: 'increase' }}
          icon={Calendar}
          iconColor="text-hf-primary"
          loading={loading}
        />
        <KPICard
          title="Ingresos del Mes"
          value={formatCurrency(data.monthRevenue)}
          change={{ value: data.monthRevenueChange, type: 'increase' }}
          icon={DollarSign}
          iconColor="text-green-600"
          loading={loading}
        />
        <KPICard
          title="Créditos Activos"
          value={formatCurrency(data.activeCredits)}
          change={{ value: data.activeCreditsChange, type: 'increase' }}
          icon={CreditCard}
          iconColor="text-purple-600"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - 2 columns */}
        <div className="lg:col-span-2">
          <RevenueChart data={data.revenueData} loading={loading} />
        </div>
        
        {/* Today's Appointments - 1 column */}
        <div className="lg:col-span-1">
          <TodayAppointments 
            appointments={data.todayAppointmentsList} 
            loading={loading} 
          />
        </div>
      </div>

      {/* Services Occupancy */}
      <div>
        <ServicesOccupancy data={data.servicesOccupancy} loading={loading} />
      </div>

      {/* Quick Actions */}
      <div className="bg-hf-primary/5 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="flex items-center justify-center gap-2 bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
            <Calendar className="h-5 w-5 text-hf-primary" />
            <span className="font-medium">Nueva Cita</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
            <Users className="h-5 w-5 text-hf-primary" />
            <span className="font-medium">Nuevo Paciente</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
            <CreditCard className="h-5 w-5 text-hf-primary" />
            <span className="font-medium">Registrar Pago</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
            <Activity className="h-5 w-5 text-hf-primary" />
            <span className="font-medium">Ver Reportes</span>
          </button>
        </div>
      </div>
    </div>
  )
}