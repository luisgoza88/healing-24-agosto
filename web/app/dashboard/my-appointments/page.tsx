'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase'
import { Calendar, Clock, User, Search, Eye, Edit, X, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  service?: string
  professional_id: string
  professional_name: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show'
  notes?: string
  total_amount: number
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  created_at: string
}

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    checkUserAndFetchAppointments()
  }, [])

  useEffect(() => {
    filterAppointments()
  }, [appointments, searchTerm, activeTab])

  const checkUserAndFetchAppointments = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Error getting user:', userError)
        return
      }
      
      setUser(user)
      await fetchMyAppointments(user.id)
    } catch (error) {
      console.error('Error in checkUserAndFetchAppointments:', error)
    }
  }

  const fetchMyAppointments = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          professionals!appointments_professional_id_fkey(full_name),
          services!appointments_service_id_fkey(name)
        `)
        .eq('user_id', userId)
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      const formattedData = data?.map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        service: apt.services?.name || 'Consulta general',
        professional_id: apt.professional_id,
        professional_name: apt.professionals?.full_name || 'No asignado',
        status: apt.status,
        notes: apt.notes,
        total_amount: apt.total_amount || 0,
        payment_status: apt.payment_status,
        created_at: apt.created_at
      })) || []

      console.log(`Found ${formattedData.length} appointments for user ${userId}`)
      setAppointments(formattedData)
    } catch (error) {
      console.error('Error fetching my appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAppointments = () => {
    let filtered = [...appointments]
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (activeTab === 'upcoming') {
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointment_date)
        aptDate.setHours(0, 0, 0, 0)
        return aptDate >= today
      })
    } else {
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointment_date)
        aptDate.setHours(0, 0, 0, 0)
        return aptDate < today
      })
    }

    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.professional_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.service.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredAppointments(filtered)
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
      case 'no_show':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'confirmed': 'Confirmada',
      'pending': 'Pendiente',
      'cancelled': 'Cancelada',
      'completed': 'Completada',
      'no_show': 'No asistió'
    }
    return labels[status] || status
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    return date.toLocaleDateString('es-ES', options)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const isToday = (dateString: string) => {
    const today = new Date()
    const date = new Date(dateString)
    return date.toDateString() === today.toDateString()
  }

  const isTomorrow = (dateString: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const date = new Date(dateString)
    return date.toDateString() === tomorrow.toDateString()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-lg text-gray-700">No se pudo cargar la información del usuario</p>
        <p className="text-sm text-gray-500 mt-2">Por favor, intente refrescar la página</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Citas</h1>
          <p className="text-sm text-gray-600 mt-1">Usuario: {user.email}</p>
        </div>
        <Link 
          href="/dashboard/appointments"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Ver todas las citas (Admin)
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por profesional o servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex space-x-1 border-b">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'upcoming'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Próximas ({appointments.filter(apt => {
              const aptDate = new Date(apt.appointment_date)
              const today = new Date()
              aptDate.setHours(0, 0, 0, 0)
              today.setHours(0, 0, 0, 0)
              return aptDate >= today
            }).length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'past'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pasadas ({appointments.filter(apt => {
              const aptDate = new Date(apt.appointment_date)
              const today = new Date()
              aptDate.setHours(0, 0, 0, 0)
              today.setHours(0, 0, 0, 0)
              return aptDate < today
            }).length})
          </button>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {activeTab === 'upcoming' 
              ? 'No tienes citas próximas' 
              : 'No tienes citas pasadas'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    {isToday(appointment.appointment_date) && (
                      <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">
                        HOY
                      </span>
                    )}
                    {isTomorrow(appointment.appointment_date) && (
                      <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                        MAÑANA
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                      {getStatusLabel(appointment.status)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {appointment.service}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDate(appointment.appointment_date)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{appointment.appointment_time}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span>{appointment.professional_name}</span>
                    </div>
                    <div className="flex items-center text-gray-900 font-semibold">
                      <span className="mr-2">💰</span>
                      <span>{formatCurrency(appointment.total_amount)}</span>
                      {appointment.payment_status === 'paid' && (
                        <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                      )}
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Notas:</span> {appointment.notes}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex flex-col space-y-2">
                  <Link 
                    href={`/dashboard/appointments/${appointment.id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                  {appointment.status === 'pending' && activeTab === 'upcoming' && (
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {appointments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Nota:</span> Esta vista muestra únicamente tus citas personales. 
            Para ver todas las citas del sistema, usa la {' '}
            <Link href="/dashboard/appointments" className="underline">
              vista administrativa
            </Link>.
          </p>
        </div>
      )}
    </div>
  )
}