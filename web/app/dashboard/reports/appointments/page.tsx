'use client'

import { useEffect, useState } from 'react'
import { createClient, useSupabase } from '@/lib/supabase'
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Download,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts'

interface AppointmentAnalytics {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  noShowAppointments: number
  completionRate: number
  cancellationRate: number
  averageDuration: number
  peakHours: Array<{ hour: string; count: number }>
  weeklyDistribution: Array<{ day: string; count: number }>
  serviceDistribution: Array<{ service: string; count: number; percentage: number }>
  professionalPerformance: Array<{ name: string; total: number; completed: number; rate: number }>
  monthlyTrend: Array<{ month: string; total: number; completed: number }>
  appointmentsByStatus: Array<{ status: string; count: number; percentage: number }>
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function AppointmentsReportPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month')
  const [analytics, setAnalytics] = useState<AppointmentAnalytics>({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    noShowAppointments: 0,
    completionRate: 0,
    cancellationRate: 0,
    averageDuration: 60,
    peakHours: [],
    weeklyDistribution: [],
    serviceDistribution: [],
    professionalPerformance: [],
    monthlyTrend: [],
    appointmentsByStatus: []
  })
  const supabase = useSupabase()

  useEffect(() => {
    fetchAppointmentAnalytics()
  }, [dateRange])

  const fetchAppointmentAnalytics = async () => {
    try {
      setLoading(true)
      
      const today = new Date()
      const startDate = getStartDate(dateRange)

      // Fetch appointments with related data
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(name),
          professional:professionals(full_name)
        `)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', today.toISOString())

      if (error) throw error

      // Calculate basic metrics
      const totalAppointments = appointments?.length || 0
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0
      const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0
      const noShowAppointments = appointments?.filter(a => a.status === 'no_show').length || 0
      
      const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0
      const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0
      
      const averageDuration = appointments?.reduce((sum, apt) => sum + (apt.duration || 60), 0) / (appointments?.length || 1)

      // Calculate peak hours
      const hourDistribution = appointments?.reduce((acc: any, apt) => {
        const hour = apt.appointment_time.split(':')[0]
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {})

      const peakHours = Object.entries(hourDistribution || {})
        .map(([hour, count]) => ({
          hour: `${hour}:00`,
          count: count as number
        }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))

      // Calculate weekly distribution
      const dayDistribution = appointments?.reduce((acc: any, apt) => {
        const dayOfWeek = new Date(apt.appointment_date).getDay()
        const dayName = DAYS[dayOfWeek === 0 ? 6 : dayOfWeek - 1]
        acc[dayName] = (acc[dayName] || 0) + 1
        return acc
      }, {})

      const weeklyDistribution = DAYS.map(day => ({
        day,
        count: dayDistribution?.[day] || 0
      }))

      // Calculate service distribution
      const serviceMap = appointments?.reduce((acc: any, apt) => {
        const serviceName = apt.service?.name || 'Otros'
        acc[serviceName] = (acc[serviceName] || 0) + 1
        return acc
      }, {})

      const serviceDistribution = Object.entries(serviceMap || {})
        .map(([service, count]) => ({
          service,
          count: count as number,
          percentage: ((count as number) / totalAppointments) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      // Calculate professional performance
      const professionalMap = appointments?.reduce((acc: any, apt) => {
        const profName = apt.professional?.full_name || 'No asignado'
        if (!acc[profName]) {
          acc[profName] = { total: 0, completed: 0 }
        }
        acc[profName].total++
        if (apt.status === 'completed') {
          acc[profName].completed++
        }
        return acc
      }, {})

      const professionalPerformance = Object.entries(professionalMap || {})
        .map(([name, stats]: [string, any]) => ({
          name,
          total: stats.total,
          completed: stats.completed,
          rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      // Calculate monthly trend
      const monthlyMap: { [key: string]: { total: number; completed: number } } = {}
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(today)
        monthDate.setMonth(today.getMonth() - i)
        const monthKey = monthDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
        monthlyMap[monthKey] = { total: 0, completed: 0 }
      }

      appointments?.forEach(apt => {
        const monthKey = new Date(apt.appointment_date).toLocaleDateString('es-ES', { 
          month: 'short', 
          year: '2-digit' 
        })
        if (monthlyMap[monthKey]) {
          monthlyMap[monthKey].total++
          if (apt.status === 'completed') {
            monthlyMap[monthKey].completed++
          }
        }
      })

      const monthlyTrend = Object.entries(monthlyMap)
        .map(([month, stats]) => ({
          month,
          total: stats.total,
          completed: stats.completed
        }))

      // Calculate appointments by status
      const statusMap = appointments?.reduce((acc: any, apt) => {
        const status = getStatusLabel(apt.status)
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})

      const appointmentsByStatus = Object.entries(statusMap || {})
        .map(([status, count]) => ({
          status,
          count: count as number,
          percentage: ((count as number) / totalAppointments) * 100
        }))

      setAnalytics({
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        completionRate,
        cancellationRate,
        averageDuration,
        peakHours,
        weeklyDistribution,
        serviceDistribution,
        professionalPerformance,
        monthlyTrend,
        appointmentsByStatus
      })
    } catch (error) {
      console.error('Error fetching appointment analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStartDate = (range: string) => {
    const today = new Date()
    switch (range) {
      case 'week':
        return new Date(today.setDate(today.getDate() - 7))
      case 'month':
        return new Date(today.setMonth(today.getMonth() - 1))
      case 'quarter':
        return new Date(today.setMonth(today.getMonth() - 3))
      case 'year':
        return new Date(today.setFullYear(today.getFullYear() - 1))
      default:
        return new Date(today.setMonth(today.getMonth() - 1))
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'pending': 'Pendientes',
      'confirmed': 'Confirmadas',
      'completed': 'Completadas',
      'cancelled': 'Canceladas',
      'no_show': 'No asistió'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Completadas': '#10B981',
      'Confirmadas': '#3B82F6',
      'Pendientes': '#F59E0B',
      'Canceladas': '#EF4444',
      'No asistió': '#6B7280'
    }
    return colors[status] || '#6B7280'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard/reports"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Análisis de Citas</h1>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Último año</option>
          </select>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Citas</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalAppointments}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-green-600">{analytics.completedAppointments}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Canceladas</p>
              <p className="text-2xl font-bold text-red-600">{analytics.cancelledAppointments}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasa Completación</p>
              <p className="text-2xl font-bold text-green-600">{analytics.completionRate.toFixed(1)}%</p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Duración Promedio</p>
              <p className="text-2xl font-bold text-purple-600">{Math.round(analytics.averageDuration)} min</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia mensual */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendencia Mensual</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Total"
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Completadas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución por estado */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Estado</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.appointmentsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.status}: ${entry.percentage.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics.appointmentsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución semanal */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Día de la Semana</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.weeklyDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Horas pico */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Horarios Más Solicitados</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Servicios más solicitados */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Servicios Más Solicitados</h2>
          <div className="space-y-3">
            {analytics.serviceDistribution.map((service, index) => (
              <div key={service.service}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-700">{service.service}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold">{service.count} citas</span>
                    <span className="text-xs text-gray-500">({service.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${service.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rendimiento de profesionales */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rendimiento de Profesionales</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Profesional
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Completadas
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Tasa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.professionalPerformance.map((prof, index) => (
                  <tr key={prof.name} className={index < 3 ? 'bg-green-50' : ''}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {prof.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-center">
                      {prof.total}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-center">
                      {prof.completed}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-right">
                      <span className={`${prof.rate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {prof.rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Indicadores de eficiencia */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Indicadores de Eficiencia</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[
                    { name: 'Completadas', value: analytics.completionRate, fill: '#10B981' }
                  ]}>
                    <RadialBar dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {analytics.completionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Tasa de Completación</p>
          </div>

          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[
                    { name: 'Canceladas', value: analytics.cancellationRate, fill: '#EF4444' }
                  ]}>
                    <RadialBar dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {analytics.cancellationRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Tasa de Cancelación</p>
          </div>

          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[
                    { 
                      name: 'No Show', 
                      value: analytics.totalAppointments > 0 
                        ? (analytics.noShowAppointments / analytics.totalAppointments) * 100 
                        : 0, 
                      fill: '#6B7280' 
                    }
                  ]}>
                    <RadialBar dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {analytics.totalAppointments > 0 
                      ? ((analytics.noShowAppointments / analytics.totalAppointments) * 100).toFixed(1)
                      : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Tasa de No Asistencia</p>
          </div>
        </div>
      </div>
    </div>
  )
}