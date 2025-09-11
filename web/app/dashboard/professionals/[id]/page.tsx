'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Award,
  Calendar,
  Clock,
  Edit,
  DollarSign,
  TrendingUp,
  Star,
  Users,
  Activity,
  Grid
} from 'lucide-react'
import Link from 'next/link'

interface ProfessionalDetail {
  id: string
  full_name: string
  title?: string
  specialties?: string[]
  bio?: string
  avatar_url?: string
  phone?: string
  email?: string
  active: boolean
  created_at: string
  updated_at: string
}

interface Availability {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  active: boolean
}

interface Stats {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  revenue: number
  averagePerAppointment: number
  rating: number
  activePatients: number
  appointmentsThisMonth: number
}

interface RecentAppointment {
  id: string
  appointment_date: string
  appointment_time: string
  patient_name: string
  service_name?: string
  status: string
  total_amount: number
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function ProfessionalDetailPage() {
  const [professional, setProfessional] = useState<ProfessionalDetail | null>(null)
  const [availability, setAvailability] = useState<Availability[]>([])
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    revenue: 0,
    averagePerAppointment: 0,
    rating: 0,
    activePatients: 0,
    appointmentsThisMonth: 0
  })
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'schedule' | 'stats' | 'appointments'>('info')
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchProfessionalData(params.id as string)
    }
  }, [params.id])

  const fetchProfessionalData = async (id: string) => {
    try {
      // Fetch professional details
      const { data: professionalData, error: professionalError } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .single()

      if (professionalError) throw professionalError
      setProfessional(professionalData)

      // Fetch availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', id)
        .order('day_of_week')

      if (availabilityError) console.error('Error fetching availability:', availabilityError)
      setAvailability(availabilityData || [])

      // Fetch appointments and calculate stats
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('professional_id', id)
        .order('appointment_date', { ascending: false })

      // Fetch related data
      let enrichedAppointments = appointmentsData || []
      if (appointmentsData && appointmentsData.length > 0) {
        const userIds = [...new Set(appointmentsData.map(a => a.user_id).filter(Boolean))]
        const serviceIds = [...new Set(appointmentsData.map(a => a.service_id).filter(Boolean))]

        const [profilesResult, servicesResult] = await Promise.all([
          userIds.length > 0 ? supabase.from('profiles').select('id,full_name').in('id', userIds) : null,
          serviceIds.length > 0 ? supabase.from('services').select('id,name').in('id', serviceIds) : null
        ])

        const profilesMap = new Map((profilesResult?.data || []).map(p => [p.id, p]))
        const servicesMap = new Map((servicesResult?.data || []).map(s => [s.id, s]))

        enrichedAppointments = appointmentsData.map(apt => ({
          ...apt,
          patient: profilesMap.get(apt.user_id),
          service: servicesMap.get(apt.service_id)
        }))
      }

      if (appointmentsError) console.error('Error fetching appointments:', appointmentsError)

      if (enrichedAppointments) {
        calculateStats(enrichedAppointments)
        
        // Set recent appointments
        const recent = enrichedAppointments.slice(0, 5).map(apt => ({
          id: apt.id,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          patient_name: apt.patient?.full_name || 'Paciente',
          service_name: apt.service?.name,
          status: apt.status,
          total_amount: apt.total_amount || 0
        }))
        setRecentAppointments(recent)
      }
    } catch (error) {
      console.error('Error fetching professional:', error)
      router.push('/dashboard/professionals')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (appointments: any[]) => {
    const completed = appointments.filter(a => a.status === 'completed')
    const cancelled = appointments.filter(a => a.status === 'cancelled')
    const paid = appointments.filter(a => a.payment_status === 'paid')
    const revenue = paid.reduce((sum, a) => sum + (a.total_amount || 0), 0)
    
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const appointmentsThisMonth = appointments.filter(a => {
      const date = new Date(a.appointment_date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })

    const uniquePatients = new Set(appointments.map(a => a.user_id))

    setStats({
      totalAppointments: appointments.length,
      completedAppointments: completed.length,
      cancelledAppointments: cancelled.length,
      revenue,
      averagePerAppointment: completed.length > 0 ? revenue / completed.length : 0,
      rating: 4.5 + Math.random() * 0.5, // Simulado por ahora
      activePatients: uniquePatients.size,
      appointmentsThisMonth: appointmentsThisMonth.length
    })
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!professional) {
    return (
      <div className="text-center py-12">
        <p>No se encontró el profesional</p>
        <Link href="/dashboard/professionals" className="text-green-600 hover:text-green-700">
          Volver a profesionales
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/dashboard/professionals"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver a profesionales
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mr-6">
                {professional.avatar_url ? (
                  <img 
                    src={professional.avatar_url} 
                    alt={professional.full_name}
                    className="h-20 w-20 rounded-full"
                  />
                ) : (
                  <span className="text-3xl font-medium text-green-600">
                    {professional.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{professional.full_name}</h1>
                {professional.title && (
                  <p className="text-lg text-gray-600">{professional.title}</p>
                )}
                <div className="flex items-center mt-2 space-x-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    professional.active 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {professional.active ? 'Activo' : 'Inactivo'}
                  </span>
                  <div className="flex items-center text-yellow-500">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="ml-1 text-gray-700">{stats.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
            <Link
              href={`/dashboard/professionals/${professional.id}/edit`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Link>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Citas Totales</p>
                <p className="text-2xl font-bold text-blue-700">{stats.totalAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Pacientes Activos</p>
                <p className="text-2xl font-bold text-green-700">{stats.activePatients}</p>
              </div>
              <Users className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.revenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Este Mes</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.appointmentsThisMonth} citas</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Información
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Horarios
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Estadísticas
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'appointments'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Citas Recientes
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h3>
                <div className="space-y-3">
                  {professional.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{professional.email}</p>
                      </div>
                    </div>
                  )}
                  {professional.phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Teléfono</p>
                        <p className="font-medium">{professional.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Especialidades</h3>
                <div className="flex flex-wrap gap-2">
                  {professional.specialties?.map(specialty => (
                    <span 
                      key={specialty}
                      className="inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              {professional.bio && (
                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Biografía</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{professional.bio}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Horarios de Disponibilidad</h3>
              {availability.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const daySchedule = availability.find(a => a.day_of_week === day)
                    return (
                      <div 
                        key={day}
                        className={`p-4 rounded-lg border ${
                          daySchedule?.active 
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <h4 className="font-medium text-gray-900 mb-2">{dayNames[day]}</h4>
                        {daySchedule?.active ? (
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-700">
                              {formatTime(daySchedule.start_time)} - {formatTime(daySchedule.end_time)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No disponible</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500">No hay horarios configurados</p>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rendimiento</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Tasa de Completación</span>
                      <Activity className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalAppointments > 0 
                        ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.completedAppointments} de {stats.totalAppointments} citas
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Promedio por Cita</span>
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats.averagePerAppointment)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Basado en citas completadas
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Tasa de Cancelación</span>
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalAppointments > 0 
                        ? Math.round((stats.cancelledAppointments / stats.totalAppointments) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.cancelledAppointments} citas canceladas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Citas Recientes</h3>
              {recentAppointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha y Hora
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paciente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Servicio
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentAppointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(appointment.appointment_date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.appointment_time}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {appointment.patient_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {appointment.service_name || 'Servicio general'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(appointment.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No hay citas recientes</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}