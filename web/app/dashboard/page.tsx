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
  RefreshCw,
  Loader2
} from 'lucide-react'
import { useDashboardStats, useTodayAppointments, useRecentActivity, useDashboardCharts } from '@/src/hooks/useDashboard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error, refetch } = useDashboardStats()
  const { data: todayAppointments, isLoading: appointmentsLoading } = useTodayAppointments()
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity()
  const { data: chartData } = useDashboardCharts()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatTime = (timeString: string) => {
    // Si viene solo la hora (HH:mm:ss), extraer solo HH:mm
    if (timeString && timeString.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes} hrs`;
    }
    
    // Si viene con fecha completa, parsear normalmente
    try {
      return format(new Date(timeString), "HH:mm 'hrs'", { locale: es });
    } catch {
      return timeString; // Retornar el valor original si no se puede parsear
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} horas`;
    return format(date, "dd MMM", { locale: es });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'no_show': return 'No asistió';
      default: return status;
    }
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

  if (error) {
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
      
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Citas Hoy</p>
              {statsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{stats?.todayAppointments || 0}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Confirmadas</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Pacientes</p>
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">{stats?.totalPatients || 0}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Registrados</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ingresos Hoy</p>
              {statsLoading ? (
                <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">{formatCurrency(stats?.todayRevenue || 0)}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Confirmados</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ingresos del Mes</p>
              {statsLoading ? (
                <div className="h-8 w-36 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Acumulado</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-500" />
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
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              Citas de Hoy
            </h2>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          
          {appointmentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : todayAppointments && todayAppointments.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {todayAppointments.map((appointment) => (
                <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-200 transform hover:scale-[1.02] transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{formatTime(appointment.appointment_time)}</span>
                      {getStatusIcon(appointment.status)}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-500">Paciente:</span> <span className="font-medium">{appointment.patient_name}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-500">Profesional:</span> <span className="font-medium">{appointment.professional_name}</span>
                    </p>
                    {appointment.service && (
                      <p className="text-sm text-blue-600 mt-2 font-medium">{appointment.service}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay citas programadas para hoy</p>
          )}
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              Actividad Reciente
            </h2>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 group">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 group-hover:scale-125 transition-transform duration-200 ${
                    activity.type === 'appointment' ? 'bg-blue-500 shadow-blue-200 shadow-md' :
                    activity.type === 'payment' ? 'bg-green-500 shadow-green-200 shadow-md' :
                    'bg-gray-500 shadow-gray-200 shadow-md'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium group-hover:text-gray-900 transition-colors">{activity.description}</p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">{formatRelativeTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay actividad reciente</p>
          )}
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/dashboard/appointments" className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
            <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <span className="text-sm text-gray-700">Nueva Cita</span>
          </a>
          <a href="/dashboard/patients" className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
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