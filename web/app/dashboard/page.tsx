'use client'

import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useDashboardStats, useDashboardCharts } from '@/hooks/useDashboard'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const { data: stats, isLoading, error, refetch } = useDashboardStats()
  const { data: chartData } = useDashboardCharts()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Hace un momento'
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} horas`
    return date.toLocaleDateString('es-ES')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-600" />
      case 'appointment':
        return <Calendar className="h-4 w-4 text-blue-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel Administrativo - Dashboard</h1>
        <LoadingSkeleton rows={10} />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel Administrativo - Dashboard</h1>
        <ErrorState message="Error al cargar el dashboard" onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Panel Administrativo - Dashboard</h1>
        <button 
          onClick={() => refetch()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualizar datos"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>
      
      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Citas Hoy</p>
              <p className="text-2xl font-bold text-gray-800">{stats.todayAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">Confirmadas</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pacientes</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalPatients}</p>
              <p className="text-xs text-gray-500 mt-1">Registrados</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Hoy</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.todayRevenue)}</p>
              <p className="text-xs text-gray-500 mt-1">Confirmados</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.monthlyRevenue)}</p>
              <p className="text-xs text-gray-500 mt-1">Acumulado</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de tendencia */}
      {chartData && chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tendencia Semanal</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dayName" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'revenue') return formatCurrency(value)
                    return value
                  }}
                  labelFormatter={(label) => `Día: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="appointments" 
                  stroke="#3b82f6" 
                  fill="#93c5fd" 
                  strokeWidth={2}
                  name="Citas"
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  fill="#86efac" 
                  strokeWidth={2}
                  name="Ingresos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citas de Hoy */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Citas de Hoy</h2>
          {stats.todayAppointmentsList.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay citas programadas para hoy</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.todayAppointmentsList.map((appointment) => (
                <div key={appointment.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{appointment.time}</span>
                        {getStatusIcon(appointment.status)}
                        <span className="text-sm text-gray-600">{appointment.patientName}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {appointment.serviceName} • Dr. {appointment.professionalName}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Actividad Reciente</h2>
          {stats.recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay actividad reciente</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/dashboard/appointments/new" className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
            <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Nueva Cita</span>
          </a>
          <a href="/dashboard/patients/new" className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
            <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Nuevo Paciente</span>
          </a>
          <a href="/dashboard/reports" className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
            <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Ver Reportes</span>
          </a>
          <a href="/dashboard/professionals" className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
            <Activity className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Profesionales</span>
          </a>
        </div>
      </div>
    </div>
  )
}