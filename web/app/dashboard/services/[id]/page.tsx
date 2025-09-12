'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  UserPlus,
  CalendarPlus,
  Settings,
  BarChart3,
  Filter,
  Download
} from 'lucide-react'
import { createClient } from '@/src/lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { SERVICE_ITEMS } from '@/src/data/serviceItems'

interface ServiceDetail {
  id: string
  name: string
  description: string
  default_duration: number
  base_price: number
}

interface Professional {
  id: string
  full_name: string
  specialties: string[]
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats' | 'professionals' | 'settings'>('stats')
  const [dateRange, setDateRange] = useState(30)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalRevenue: 0,
    averagePerAppointment: 0,
    topProfessional: '',
    peakHour: '',
    monthlyGrowth: 0
  })

  useEffect(() => {
    loadServiceData()
  }, [serviceId])

  const loadServiceData = async () => {
    try {
      const supabase = createClient()
      
      // Cargar información del servicio
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single()

      if (serviceError) throw serviceError
      setService(serviceData)

      // Cargar profesionales que ofrecen este servicio
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('*')
        .contains('service_ids', [serviceId])

      setProfessionals(professionalsData || [])

      // Cargar estadísticas
      await loadStats()
    } catch (error) {
      console.error('Error loading service data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const supabase = createClient()
      const startDate = subMonths(new Date(), 1).toISOString().split('T')[0]
      
      // Estadísticas generales
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('service_id', serviceId)
        .gte('appointment_date', startDate)

      const totalAppointments = appointments?.length || 0
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0
      const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0
      
      const totalRevenue = appointments
        ?.filter(a => a.payment_status === 'paid')
        .reduce((sum, a) => sum + (a.total_amount || 0), 0) || 0

      const averagePerAppointment = completedAppointments > 0 
        ? totalRevenue / completedAppointments 
        : 0

      // Encontrar el profesional más solicitado
      const professionalCounts = appointments?.reduce((acc: Record<string, number>, apt) => {
        if (apt.professional_id) {
          acc[apt.professional_id] = (acc[apt.professional_id] || 0) + 1
        }
        return acc
      }, {}) || {}

      const topProfessionalId = Object.entries(professionalCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0]

      let topProfessionalName = 'N/A'
      if (topProfessionalId) {
        const { data: prof } = await supabase
          .from('professionals')
          .select('full_name')
          .eq('id', topProfessionalId)
          .single()
        topProfessionalName = prof?.full_name || 'N/A'
      }

      // Calcular hora pico
      const hourCounts = appointments?.reduce((acc: Record<string, number>, apt) => {
        if (apt.appointment_time) {
          const hour = parseInt(apt.appointment_time.split(':')[0])
          const hourKey = `${hour}:00`
          acc[hourKey] = (acc[hourKey] || 0) + 1
        }
        return acc
      }, {}) || {}

      const peakHour = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

      // Calcular crecimiento mensual
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1))
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1))
      const thisMonthStart = startOfMonth(new Date())

      const { count: lastMonthCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId)
        .gte('appointment_date', lastMonthStart.toISOString().split('T')[0])
        .lte('appointment_date', lastMonthEnd.toISOString().split('T')[0])

      const { count: thisMonthCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId)
        .gte('appointment_date', thisMonthStart.toISOString().split('T')[0])

      const monthlyGrowth = lastMonthCount && lastMonthCount > 0
        ? ((thisMonthCount! - lastMonthCount) / lastMonthCount) * 100
        : 0

      setStats({
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalRevenue,
        averagePerAppointment,
        topProfessional: topProfessionalName,
        peakHour,
        monthlyGrowth
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getServiceItems = (serviceName: string) => {
    return SERVICE_ITEMS[serviceName] || []
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-600">Servicio no encontrado</p>
          <button
            onClick={() => router.push('/dashboard/services')}
            className="mt-4 text-green-600 hover:text-green-700"
          >
            Volver a servicios
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/services')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a servicios
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{service.name}</h1>
            <p className="text-gray-600 mt-1">{service.description}</p>
          </div>
          
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              <CalendarPlus className="w-4 h-4" />
              Nueva cita
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline-block mr-2" />
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4 inline-block mr-2" />
            Calendario
          </button>
          <button
            onClick={() => setActiveTab('professionals')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'professionals'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-2" />
            Profesionales
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="w-4 h-4 inline-block mr-2" />
            Configuración
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'stats' && (
        <div>
          {/* Sub-servicios del servicio principal */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Sub-servicios disponibles</h3>
            <div className="grid gap-4">
              {getServiceItems(service.name).map((item, index) => (
                <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {item.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(item.price)} {item.priceNote || ''}
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Agendar
                    </button>
                  </div>
                </div>
              ))}
              {getServiceItems(service.name).length === 0 && (
                <p className="text-gray-500 text-center py-8">No hay sub-servicios configurados</p>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Citas del mes</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalAppointments}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}% vs mes anterior
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ingresos del mes</p>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCurrency(stats.averagePerAppointment)} promedio
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasa de completadas</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.totalAppointments > 0 
                      ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.completedAppointments} de {stats.totalAppointments}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hora pico</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.peakHour}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Profesional top: {stats.topProfessional}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Calendario del servicio</h3>
          <p className="text-gray-600">
            Aquí podrás gestionar la disponibilidad, horarios y citas específicas de {service.name}.
          </p>
          <div className="mt-8 text-center text-gray-400">
            <Calendar className="w-16 h-16 mx-auto mb-4" />
            <p>Calendario en desarrollo...</p>
          </div>
        </div>
      )}

      {activeTab === 'professionals' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Profesionales que ofrecen este servicio</h3>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Asignar profesional
            </button>
          </div>

          <div className="grid gap-4">
            {professionals.map((professional) => (
              <div key={professional.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800">{professional.full_name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Especialidades: {professional.specialties?.join(', ') || 'No especificadas'}
                    </p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            
            {professionals.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No hay profesionales asignados a este servicio</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-6">Configuración del servicio</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración predeterminada
              </label>
              <input
                type="number"
                value={service.default_duration || 60}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                readOnly
              />
              <p className="text-sm text-gray-500 mt-1">Minutos</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio base
              </label>
              <input
                type="text"
                value={formatCurrency(service.base_price || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                readOnly
              />
            </div>

            <div className="pt-4 border-t">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}