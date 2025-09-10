'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase'
import { 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Users,
  Activity,
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts'

interface DashboardMetrics {
  totalRevenue: number
  totalAppointments: number
  activePatients: number
  completionRate: number
  revenueGrowth: number
  appointmentGrowth: number
  averageTicket: number
  topServices: Array<{ name: string; count: number; revenue: number }>
  monthlyRevenue: Array<{ month: string; revenue: number }>
  appointmentsByStatus: Array<{ status: string; count: number }>
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month')
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalAppointments: 0,
    activePatients: 0,
    completionRate: 0,
    revenueGrowth: 0,
    appointmentGrowth: 0,
    averageTicket: 0,
    topServices: [],
    monthlyRevenue: [],
    appointmentsByStatus: []
  })
  const supabase = createClient()

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      
      const today = new Date()
      const startDate = getStartDate(dateRange)

      // Fetch appointments with related data
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(name),
          professional:professionals(full_name)
        `)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', today.toISOString())

      if (appointmentsError) throw appointmentsError

      // Fetch unique patients
      const { data: patients, error: patientsError } = await supabase
        .from('appointments')
        .select('user_id')
        .gte('appointment_date', startDate.toISOString())

      if (patientsError) throw patientsError

      const uniquePatients = new Set(patients?.map(p => p.user_id) || [])

      // Calculate metrics
      const totalRevenue = appointments?.reduce((sum, apt) => 
        apt.payment_status === 'paid' ? sum + (apt.total_amount || 0) : sum, 0) || 0

      const completedAppointments = appointments?.filter(apt => apt.status === 'completed') || []
      const completionRate = appointments?.length > 0 
        ? (completedAppointments.length / appointments.length) * 100 
        : 0

      // Calculate growth (comparing with previous period)
      const previousStartDate = getPreviousStartDate(dateRange)
      const { data: previousAppointments } = await supabase
        .from('appointments')
        .select('total_amount, payment_status')
        .gte('appointment_date', previousStartDate.toISOString())
        .lt('appointment_date', startDate.toISOString())

      const previousRevenue = previousAppointments?.reduce((sum, apt) => 
        apt.payment_status === 'paid' ? sum + (apt.total_amount || 0) : sum, 0) || 0

      const revenueGrowth = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0

      const appointmentGrowth = previousAppointments?.length > 0
        ? ((appointments.length - previousAppointments.length) / previousAppointments.length) * 100
        : 0

      // Calculate service statistics
      const serviceStats = appointments?.reduce((acc: any, apt) => {
        const serviceName = apt.service?.name || 'Otros'
        if (!acc[serviceName]) {
          acc[serviceName] = { count: 0, revenue: 0 }
        }
        acc[serviceName].count++
        if (apt.payment_status === 'paid') {
          acc[serviceName].revenue += apt.total_amount || 0
        }
        return acc
      }, {})

      const topServices = Object.entries(serviceStats || {})
        .map(([name, stats]: [string, any]) => ({
          name,
          count: stats.count,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Calculate monthly revenue
      const monthlyRevenueMap = appointments?.reduce((acc: any, apt) => {
        if (apt.payment_status === 'paid') {
          const month = new Date(apt.appointment_date).toLocaleDateString('es-ES', { 
            month: 'short',
            year: '2-digit'
          })
          if (!acc[month]) {
            acc[month] = 0
          }
          acc[month] += apt.total_amount || 0
        }
        return acc
      }, {})

      const monthlyRevenue = Object.entries(monthlyRevenueMap || {})
        .map(([month, revenue]) => ({ month, revenue: revenue as number }))
        .reverse()

      // Calculate appointments by status
      const statusCounts = appointments?.reduce((acc: any, apt) => {
        const status = getStatusLabel(apt.status)
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})

      const appointmentsByStatus = Object.entries(statusCounts || {})
        .map(([status, count]) => ({ status, count: count as number }))

      setMetrics({
        totalRevenue,
        totalAppointments: appointments?.length || 0,
        activePatients: uniquePatients.size,
        completionRate,
        revenueGrowth,
        appointmentGrowth,
        averageTicket: completedAppointments.length > 0 
          ? totalRevenue / completedAppointments.length 
          : 0,
        topServices,
        monthlyRevenue,
        appointmentsByStatus
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
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

  const getPreviousStartDate = (range: string) => {
    const startDate = getStartDate(range)
    switch (range) {
      case 'week':
        return new Date(startDate.setDate(startDate.getDate() - 7))
      case 'month':
        return new Date(startDate.setMonth(startDate.getMonth() - 1))
      case 'quarter':
        return new Date(startDate.setMonth(startDate.getMonth() - 3))
      case 'year':
        return new Date(startDate.setFullYear(startDate.getFullYear() - 1))
      default:
        return new Date(startDate.setMonth(startDate.getMonth() - 1))
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    const formatted = value.toFixed(1)
    return value > 0 ? `+${formatted}%` : `${formatted}%`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
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
            Exportar
          </button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.totalRevenue)}
              </p>
              <p className={`text-sm mt-2 ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(metrics.revenueGrowth)} vs periodo anterior
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Citas Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.totalAppointments}
              </p>
              <p className={`text-sm mt-2 ${metrics.appointmentGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(metrics.appointmentGrowth)} vs periodo anterior
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pacientes Activos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.activePatients}
              </p>
              <p className="text-sm text-gray-500 mt-2">En el periodo</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.averageTicket)}
              </p>
              <p className="text-sm text-gray-500 mt-2">Por cita completada</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Activity className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de ingresos mensuales */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Evolución de Ingresos</h2>
            <LineChart className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${(value / 1000)}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de servicios más solicitados */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Servicios Más Rentables</h2>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.topServices} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `${(value / 1000)}k`} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución de citas por estado */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Estado de Citas</h2>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={metrics.appointmentsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, count }) => `${status}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {metrics.appointmentsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Tasa de completación */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Eficiencia Operativa</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Tasa de Completación</span>
                <span className="text-sm font-semibold text-gray-900">
                  {metrics.completionRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${metrics.completionRate}%` }}
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Desglose de citas:</p>
              {metrics.appointmentsByStatus.map(({ status, count }) => (
                <div key={status} className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-700">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Links a reportes detallados */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reportes Detallados</h2>
          <div className="space-y-3">
            <Link 
              href="/dashboard/reports/revenue"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-gray-700">Análisis de Ingresos</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link 
              href="/dashboard/reports/appointments"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-gray-700">Reporte de Citas</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link 
              href="/dashboard/reports/patients"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-gray-700">Análisis de Pacientes</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link 
              href="/dashboard/reports/professionals"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-yellow-600 mr-3" />
                <span className="text-gray-700">Rendimiento Profesionales</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}