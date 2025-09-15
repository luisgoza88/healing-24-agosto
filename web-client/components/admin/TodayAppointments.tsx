'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react'

interface Appointment {
  id: string
  date: string
  time: string
  status: string
  patient: {
    id: string
    full_name: string
    phone?: string
    email?: string
  }
  professional: {
    id: string
    full_name: string
  }
  service: {
    id: string
    name: string
    duration: number
    price: number
  }
}

export default function TodayAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadTodayAppointments()
    
    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('appointments-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments',
          filter: `date=gte.${getTodayStart()}&date=lt.${getTomorrowStart()}`
        }, 
        () => {
          loadTodayAppointments()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  function getTodayStart() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.toISOString()
  }

  function getTomorrowStart() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow.toISOString()
  }

  async function loadTodayAppointments() {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients!inner(*),
          professional:professionals(*),
          service:services(*)
        `)
        .gte('date', getTodayStart())
        .lt('date', getTomorrowStart())
        .order('date', { ascending: true })

      if (error) throw error

      setAppointments(data || [])
    } catch (error) {
      console.error('Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)

      if (error) throw error

      // Actualizar estado local
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      )
    } catch (error) {
      console.error('Error updating appointment:', error)
      alert('Error al actualizar el estado de la cita')
    }
  }

  // Filtrar citas
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.professional.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.service.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || appointment.status === filterStatus

    return matchesSearch && matchesFilter
  })

  // Agrupar citas por hora
  const appointmentsByHour = filteredAppointments.reduce((acc, appointment) => {
    const hour = format(new Date(appointment.date), 'HH:00')
    if (!acc[hour]) acc[hour] = []
    acc[hour].push(appointment)
    return acc
  }, {} as Record<string, Appointment[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando citas del día...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Citas de Hoy</h1>
        <p className="text-gray-600 mt-1">
          {format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por paciente, profesional o servicio..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({appointments.length})
            </button>
            <button
              onClick={() => setFilterStatus('confirmed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'confirmed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Confirmadas
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilterStatus('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Canceladas
            </button>
          </div>
        </div>
      </div>

      {/* Lista de citas */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay citas que mostrar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(appointmentsByHour).map(([hour, hourAppointments]) => (
            <div key={hour} className="bg-white rounded-lg shadow">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{hour}</h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {hourAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAppointment(appointment)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="text-lg font-medium text-gray-900">
                            {format(new Date(appointment.date), 'HH:mm')}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : appointment.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.status === 'confirmed' ? 'Confirmada' : 
                             appointment.status === 'pending' ? 'Pendiente' :
                             appointment.status === 'cancelled' ? 'Cancelada' : appointment.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Paciente</p>
                            <p className="font-medium text-gray-900">{appointment.patient.full_name}</p>
                            {appointment.patient.phone && (
                              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <Phone className="w-3 h-3" />
                                {appointment.patient.phone}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Servicio</p>
                            <p className="font-medium text-gray-900">{appointment.service.name}</p>
                            <p className="text-sm text-gray-600">
                              {appointment.service.duration} min - ${appointment.service.price}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Profesional</p>
                            <p className="font-medium text-gray-900">Dr. {appointment.professional.full_name}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {appointment.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateAppointmentStatus(appointment.id, 'confirmed')
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Confirmar cita"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateAppointmentStatus(appointment.id, 'cancelled')
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancelar cita"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalles */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Detalles de la Cita</h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Aquí puedes agregar más detalles de la cita */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Información del Paciente</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><span className="font-medium">Nombre:</span> {selectedAppointment.patient.full_name}</p>
                  {selectedAppointment.patient.phone && (
                    <p><span className="font-medium">Teléfono:</span> {selectedAppointment.patient.phone}</p>
                  )}
                  {selectedAppointment.patient.email && (
                    <p><span className="font-medium">Email:</span> {selectedAppointment.patient.email}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Detalles de la Cita</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><span className="font-medium">Fecha:</span> {format(new Date(selectedAppointment.date), "EEEE d 'de' MMMM", { locale: es })}</p>
                  <p><span className="font-medium">Hora:</span> {format(new Date(selectedAppointment.date), 'HH:mm')}</p>
                  <p><span className="font-medium">Servicio:</span> {selectedAppointment.service.name}</p>
                  <p><span className="font-medium">Duración:</span> {selectedAppointment.service.duration} minutos</p>
                  <p><span className="font-medium">Precio:</span> ${selectedAppointment.service.price}</p>
                  <p><span className="font-medium">Profesional:</span> Dr. {selectedAppointment.professional.full_name}</p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cerrar
                </button>
                {selectedAppointment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        updateAppointmentStatus(selectedAppointment.id, 'confirmed')
                        setSelectedAppointment(null)
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Confirmar Cita
                    </button>
                    <button
                      onClick={() => {
                        updateAppointmentStatus(selectedAppointment.id, 'cancelled')
                        setSelectedAppointment(null)
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Cancelar Cita
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}