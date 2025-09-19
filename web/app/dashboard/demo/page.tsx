'use client'

import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DemoDashboardPage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Datos de demo hardcodeados
  const stats = {
    todayAppointments: 5,
    totalPatients: 127,
    todayRevenue: 2850500,
    monthlyRevenue: 45320750,
  }

  const todayAppointments = [
    {
      id: '1',
      appointment_time: '09:00',
      patient_name: 'María García',
      professional_name: 'Dr. Juan Pérez',
      service: 'Consulta General',
      status: 'confirmed',
    },
    {
      id: '2',
      appointment_time: '10:30',
      patient_name: 'Carlos López',
      professional_name: 'Dra. Ana Martínez',
      service: 'Terapia Física',
      status: 'confirmed',
    },
    {
      id: '3',
      appointment_time: '14:00',
      patient_name: 'Laura Rodríguez',
      professional_name: 'Dr. Juan Pérez',
      service: 'Consulta de Seguimiento',
      status: 'pending',
    },
  ]

  const recentActivity = [
    {
      id: '1',
      type: 'appointment',
      description: 'Nueva cita agendada con María García',
      timestamp: 'Hace 30 minutos',
    },
    {
      id: '2',
      type: 'payment',
      description: 'Pago recibido: $850.000',
      timestamp: 'Hace 1 hora',
    },
    {
      id: '3',
      type: 'appointment',
      description: 'Nueva cita agendada con Carlos López',
      timestamp: 'Hace 2 horas',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada'
      case 'pending': return 'Pendiente'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Demo (Sin Autenticación)</h1>
        <button 
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
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{stats.todayAppointments}</p>
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
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">{stats.totalPatients}</p>
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
              <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">{formatCurrency(stats.todayRevenue)}</p>
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
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">{formatCurrency(stats.monthlyRevenue)}</p>
              <p className="text-xs text-gray-500 mt-1">Acumulado</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

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
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todayAppointments.map((appointment) => (
              <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-200 transform hover:scale-[1.02] transition-all duration-200 cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{appointment.appointment_time}</span>
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
                  <p className="text-sm text-blue-600 mt-2 font-medium">{appointment.service}</p>
                </div>
              </div>
            ))}
          </div>
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
                  <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
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