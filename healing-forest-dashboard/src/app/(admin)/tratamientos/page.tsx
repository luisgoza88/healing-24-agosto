"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { 
  Calendar,
  Clock,
  User,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Heart,
  X,
  Edit,
  Trash2,
  AlertCircle,
  Phone,
  Mail,
  Search,
  Loader2,
  Activity,
  CalendarDays,
  TrendingUp
} from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addMinutes, parse, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface TreatmentBooking {
  id: string
  room_id: string
  appointment_id: string | null
  service_type: 'facial' | 'massage'
  service_id: string
  sub_service_id: string | null
  professional_id: string
  client_id: string
  booking_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: string
  notes: string | null
  services?: {
    id: string
    name: string
  }
  sub_services?: {
    id: string
    name: string
  }
  professionals?: {
    id: string
    full_name: string
  }
  profiles?: {
    id: string
    full_name: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    email: string | null
  }
}

interface TimeSlot {
  time: string
  available: boolean
  booking?: TreatmentBooking
}

export default function TratamientosPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookings, setBookings] = useState<TreatmentBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<TreatmentBooking | null>(null)
  const [showEditBooking, setShowEditBooking] = useState(false)
  const [filterService, setFilterService] = useState<'all' | 'facial' | 'massage'>('all')
  const [roomId, setRoomId] = useState<string | null>(null)
  
  // Estadísticas
  const [todaySessions, setTodaySessions] = useState(0)
  const [weekSessions, setWeekSessions] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState(0)

  const timeSlots = [
    '08:00', '08:15', '08:30', '08:45', 
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00'
  ]

  useEffect(() => {
    fetchRoomAndBookings()
    fetchStatistics()
  }, [selectedDate])

  const fetchRoomAndBookings = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowser()

    try {
      // Obtener la sala de tratamientos
      const { data: roomData } = await supabase
        .from('treatment_rooms')
        .select('id')
        .eq('is_active', true)
        .single()

      if (roomData) {
        setRoomId(roomData.id)

        // Obtener reservas para la fecha seleccionada
        const { data: bookingsData } = await supabase
          .from('treatment_room_bookings')
          .select(`
            *,
            services (id, name),
            sub_services (id, name),
            professionals (id, full_name),
            profiles (id, full_name, first_name, last_name, phone, email)
          `)
          .eq('room_id', roomData.id)
          .eq('booking_date', format(selectedDate, 'yyyy-MM-dd'))
          .neq('status', 'cancelled')
          .order('start_time')

        setBookings(bookingsData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    const supabase = getSupabaseBrowser()
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)

    try {
      // Sesiones de hoy
      const { data: todayData } = await supabase
        .from('treatment_room_bookings')
        .select('id')
        .eq('booking_date', format(today, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')

      setTodaySessions(todayData?.length || 0)

      // Sesiones de la semana
      const { data: weekData } = await supabase
        .from('treatment_room_bookings')
        .select('id')
        .gte('booking_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')

      setWeekSessions(weekData?.length || 0)

      // Ingresos del mes - necesitamos obtener el precio de los sub-servicios
      const { data: monthData } = await supabase
        .from('treatment_room_bookings')
        .select('sub_service_id, sub_services!inner(price)')
        .gte('booking_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('status', 'confirmed')

      const totalIncome = monthData?.reduce((sum, booking) => {
        return sum + (booking.sub_services?.price || 0)
      }, 0) || 0

      setMonthlyIncome(totalIncome)
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const getTimeSlots = (): TimeSlot[] => {
    return timeSlots.map(time => {
      const booking = bookings.find(b => {
        const bookingStart = b.start_time.slice(0, 5)
        const bookingEnd = b.end_time.slice(0, 5)
        return time >= bookingStart && time < bookingEnd
      })

      return {
        time,
        available: !booking,
        booking
      }
    })
  }

  const getServiceIcon = (type: 'facial' | 'massage') => {
    return type === 'facial' ? (
      <Sparkles className="h-5 w-5" />
    ) : (
      <Heart className="h-5 w-5" />
    )
  }

  const getServiceColor = (type: 'facial' | 'massage') => {
    return type === 'facial' ? 'bg-purple-100 text-purple-800' : 'bg-pink-100 text-pink-800'
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return

    const supabase = getSupabaseBrowser()
    
    try {
      const { error } = await supabase
        .from('treatment_room_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      // Si hay appointment asociado, cancelarlo también
      const booking = bookings.find(b => b.id === bookingId)
      if (booking?.appointment_id) {
        await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', booking.appointment_id)
      }

      fetchRoomAndBookings()
      fetchStatistics()
      setSelectedBooking(null)
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Error al cancelar la reserva')
    }
  }

  const filteredTimeSlots = getTimeSlots().filter(slot => {
    if (filterService === 'all') return true
    return slot.booking?.service_type === filterService
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando calendario...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sala de Tratamientos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de citas para faciales y masajes
          </p>
        </div>
        <button
          onClick={() => setShowNewBooking(true)}
          className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nueva Reserva
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sesiones Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{todaySessions}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sesiones Semana</p>
              <p className="text-2xl font-bold text-gray-900">{weekSessions}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CalendarDays className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos Mes</p>
              <p className="text-2xl font-bold text-gray-900">
                ${monthlyIncome.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Date Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(prev => addDays(prev, -1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">
                {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            <button
              onClick={() => setSelectedDate(prev => addDays(prev, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hoy
            </button>
          </div>

          {/* Service Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="all">Todos los servicios</option>
              <option value="facial">Solo Faciales</option>
              <option value="massage">Solo Masajes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Horarios Disponibles</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-gray-600">Facial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                <span className="text-gray-600">Masaje</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredTimeSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => {
                  if (slot.booking) {
                    setSelectedBooking(slot.booking)
                  } else {
                    setSelectedSlot(slot)
                    setShowNewBooking(true)
                  }
                }}
                className={`
                  p-3 rounded-lg border-2 transition-all
                  ${slot.available 
                    ? 'border-gray-200 hover:border-green-500 hover:bg-green-50' 
                    : slot.booking?.service_type === 'facial'
                    ? 'border-purple-200 bg-purple-50 hover:border-purple-300'
                    : 'border-pink-200 bg-pink-50 hover:border-pink-300'
                  }
                `}
              >
                <div className="text-sm font-medium text-gray-900">{slot.time}</div>
                {slot.booking && (
                  <div className="mt-1 text-xs text-gray-600">
                    {slot.booking.service_type === 'facial' ? 'Facial' : 'Masaje'}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Booking Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalles de la Reserva
                </h2>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getServiceColor(selectedBooking.service_type)}`}>
                {getServiceIcon(selectedBooking.service_type)}
                <span>{selectedBooking.service_type === 'facial' ? 'Facial' : 'Masaje'}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Servicio</p>
                  <p className="font-medium text-gray-900">
                    {selectedBooking.sub_services?.name || selectedBooking.services?.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium text-gray-900">
                    {selectedBooking.profiles?.first_name && selectedBooking.profiles?.last_name
                      ? `${selectedBooking.profiles.first_name} ${selectedBooking.profiles.last_name}`
                      : selectedBooking.profiles?.full_name || 'Sin nombre'}
                  </p>
                  {selectedBooking.profiles?.phone && (
                    <div className="flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <p className="text-sm text-gray-600">{selectedBooking.profiles.phone}</p>
                    </div>
                  )}
                  {selectedBooking.profiles?.email && (
                    <div className="flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <p className="text-sm text-gray-600">{selectedBooking.profiles.email}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500">Profesional</p>
                  <p className="font-medium text-gray-900">
                    {selectedBooking.professionals?.full_name}
                  </p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Hora</p>
                    <p className="font-medium text-gray-900">
                      {selectedBooking.start_time.slice(0, 5)} - {selectedBooking.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duración</p>
                    <p className="font-medium text-gray-900">
                      {selectedBooking.duration_minutes} minutos
                    </p>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notas</p>
                    <p className="text-gray-900">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowEditBooking(true)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteBooking(selectedBooking.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal */}
      {showNewBooking && (
        <NewBookingModal
          roomId={roomId!}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          onClose={() => {
            setShowNewBooking(false)
            setSelectedSlot(null)
          }}
          onSuccess={() => {
            setShowNewBooking(false)
            setSelectedSlot(null)
            fetchRoomAndBookings()
          }}
        />
      )}

      {/* Edit Booking Modal */}
      {showEditBooking && selectedBooking && (
        <EditBookingModal
          booking={selectedBooking}
          roomId={roomId!}
          onClose={() => {
            setShowEditBooking(false)
            setSelectedBooking(null)
          }}
          onSuccess={() => {
            setShowEditBooking(false)
            setSelectedBooking(null)
            fetchRoomAndBookings()
          }}
        />
      )}
    </div>
  )
}

// Componente para el modal de nueva reserva
interface NewBookingModalProps {
  roomId: string
  selectedDate: Date
  selectedSlot: TimeSlot | null
  onClose: () => void
  onSuccess: () => void
}

function NewBookingModal({ roomId, selectedDate, selectedSlot, onClose, onSuccess }: NewBookingModalProps) {
  const [serviceType, setServiceType] = useState<'facial' | 'massage'>('facial')
  const [services, setServices] = useState<any[]>([])
  const [subServices, setSubServices] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [searchClient, setSearchClient] = useState('')
  const [loadingClients, setLoadingClients] = useState(false)
  const [formData, setFormData] = useState({
    service_id: '',
    sub_service_id: '',
    professional_id: '',
    client_id: '',
    start_time: selectedSlot?.time || '09:00',
    duration_minutes: 60,
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAllSubServices()
    loadProfessionals()
  }, [])

  const loadAllSubServices = async () => {
    const supabase = getSupabaseBrowser()
    
    // Cargar ambos servicios (Faciales y Masajes)
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .in('name', ['Faciales', 'Masajes'])

    if (servicesData && servicesData.length > 0) {
      // Guardar los servicios
      const facialService = servicesData.find(s => s.name === 'Faciales')
      const massageService = servicesData.find(s => s.name === 'Masajes')
      
      // Cargar todos los sub-servicios de ambos tipos
      const serviceIds = servicesData.map(s => s.id)
      const { data: allSubServices } = await supabase
        .from('sub_services')
        .select('*, services!inner(name)')
        .in('service_id', serviceIds)
        .eq('active', true)
        .order('name')

      if (allSubServices) {
        // Agregar el tipo de servicio a cada sub-servicio para mostrar en el dropdown
        const enrichedSubServices = allSubServices.map(sub => ({
          ...sub,
          display_name: `${sub.name} (${sub.services.name})`,
          service_type: sub.services.name === 'Faciales' ? 'facial' : 'massage'
        }))
        setSubServices(enrichedSubServices)
      }
      
      // Establecer el service_id según el tipo seleccionado
      if (serviceType === 'facial' && facialService) {
        setFormData(prev => ({ ...prev, service_id: facialService.id }))
      } else if (serviceType === 'massage' && massageService) {
        setFormData(prev => ({ ...prev, service_id: massageService.id }))
      }
    }
  }

  const loadProfessionals = async () => {
    const supabase = getSupabaseBrowser()
    
    const { data } = await supabase
      .from('professionals')
      .select('*')
      .order('full_name')

    setProfessionals(data || [])
  }

  const searchClients = async (query: string) => {
    if (!query || query.length < 2) {
      setClients([])
      return
    }

    setLoadingClients(true)
    const supabase = getSupabaseBrowser()

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email, phone')
        .or(`full_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

      setClients(data || [])
    } catch (error) {
      console.error('Error searching clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = getSupabaseBrowser()

    try {
      // Calcular hora de fin
      const startTime = parse(formData.start_time, 'HH:mm', new Date())
      const endTime = addMinutes(startTime, formData.duration_minutes)

      // Verificar disponibilidad
      const { data: isAvailable } = await supabase
        .rpc('check_treatment_room_availability', {
          p_room_id: roomId,
          p_date: format(selectedDate, 'yyyy-MM-dd'),
          p_start_time: formData.start_time,
          p_end_time: format(endTime, 'HH:mm')
        })

      if (!isAvailable) {
        alert('El horario seleccionado no está disponible')
        return
      }

      // Crear la reserva
      const { error } = await supabase
        .from('treatment_room_bookings')
        .insert({
          room_id: roomId,
          service_type: serviceType,
          service_id: formData.service_id,
          sub_service_id: formData.sub_service_id || null,
          professional_id: formData.professional_id,
          client_id: formData.client_id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: formData.start_time,
          end_time: format(endTime, 'HH:mm'),
          duration_minutes: formData.duration_minutes,
          notes: formData.notes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error

      onSuccess()
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Error al crear la reserva')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Nueva Reserva - {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Tipo de servicio - Removido, ya no es necesario seleccionar primero */}

          {/* Sub-servicio */}
          <div>
            <label htmlFor="sub_service_id" className="block text-sm font-medium text-gray-700 mb-1">
              Servicio Específico
            </label>
            <select
              id="sub_service_id"
              value={formData.sub_service_id}
              onChange={(e) => {
                const subService = subServices.find(s => s.id === e.target.value)
                if (subService) {
                  // Actualizar el service_id y service_type basado en el sub-servicio seleccionado
                  setServiceType(subService.service_type)
                  setFormData(prev => ({
                    ...prev,
                    service_id: subService.service_id,
                    sub_service_id: e.target.value,
                    duration_minutes: subService.duration_minutes || 60
                  }))
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              required
            >
              <option value="">Seleccionar servicio</option>
              {subServices.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.display_name} - {sub.duration_minutes} min
                </option>
              ))}
            </select>
            
            {/* Mostrar tipo de servicio seleccionado */}
            {formData.sub_service_id && (
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  serviceType === 'facial' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-pink-100 text-pink-800'
                }`}>
                  {serviceType === 'facial' ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Facial</span>
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4" />
                      <span>Masaje</span>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchClient}
                onChange={(e) => {
                  setSearchClient(e.target.value)
                  searchClients(e.target.value)
                }}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
              {loadingClients && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
              )}
            </div>
            
            {clients.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {clients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, client_id: client.id }))
                      setSearchClient(client.full_name || `${client.first_name} ${client.last_name}`)
                      setClients([])
                    }}
                    className="w-full p-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-gray-900">
                      {client.first_name} {client.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{client.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profesional */}
          <div>
            <label htmlFor="professional_id" className="block text-sm font-medium text-gray-700 mb-1">
              Profesional
            </label>
            <select
              id="professional_id"
              value={formData.professional_id}
              onChange={(e) => setFormData(prev => ({ ...prev, professional_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              required
            >
              <option value="">Seleccionar profesional</option>
              {professionals.map(prof => (
                <option key={prof.id} value={prof.id}>
                  {prof.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Hora y duración */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                Hora de inicio
              </label>
              <input
                type="time"
                id="start_time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
                required
              />
            </div>
            <div>
              <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
                Duración (minutos)
              </label>
              <input
                type="number"
                id="duration_minutes"
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                min="30"
                max="180"
                step="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
                required
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={loading || !formData.client_id || !formData.professional_id || !formData.sub_service_id}
            >
              {loading ? 'Creando...' : 'Crear Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente para editar reserva existente
interface EditBookingModalProps {
  booking: TreatmentBooking
  roomId: string
  onClose: () => void
  onSuccess: () => void
}

function EditBookingModal({ booking, roomId, onClose, onSuccess }: EditBookingModalProps) {
  const [serviceType, setServiceType] = useState<'facial' | 'massage'>(booking.service_type)
  const [subServices, setSubServices] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [searchClient, setSearchClient] = useState('')
  const [loadingClients, setLoadingClients] = useState(false)
  const [formData, setFormData] = useState({
    service_id: booking.service_id,
    sub_service_id: booking.sub_service_id || '',
    professional_id: booking.professional_id,
    client_id: booking.client_id,
    start_time: booking.start_time.slice(0, 5),
    duration_minutes: booking.duration_minutes,
    notes: booking.notes || ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAllSubServices()
    loadProfessionals()
    // Cargar el nombre del cliente actual
    if (booking.profiles) {
      const clientName = booking.profiles.first_name && booking.profiles.last_name
        ? `${booking.profiles.first_name} ${booking.profiles.last_name}`
        : booking.profiles.full_name || ''
      setSearchClient(clientName)
    }
  }, [])

  const loadAllSubServices = async () => {
    const supabase = getSupabaseBrowser()
    
    // Cargar ambos servicios (Faciales y Masajes)
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .in('name', ['Faciales', 'Masajes'])

    if (servicesData && servicesData.length > 0) {
      // Cargar todos los sub-servicios de ambos tipos
      const serviceIds = servicesData.map(s => s.id)
      const { data: allSubServices } = await supabase
        .from('sub_services')
        .select('*, services!inner(name)')
        .in('service_id', serviceIds)
        .eq('active', true)
        .order('name')

      if (allSubServices) {
        // Agregar el tipo de servicio a cada sub-servicio para mostrar en el dropdown
        const enrichedSubServices = allSubServices.map(sub => ({
          ...sub,
          display_name: `${sub.name} (${sub.services.name})`,
          service_type: sub.services.name === 'Faciales' ? 'facial' : 'massage'
        }))
        setSubServices(enrichedSubServices)
      }
    }
  }

  const loadProfessionals = async () => {
    const supabase = getSupabaseBrowser()
    
    const { data } = await supabase
      .from('professionals')
      .select('*')
      .order('full_name')

    setProfessionals(data || [])
  }

  const searchClients = async (query: string) => {
    if (!query || query.length < 2) {
      setClients([])
      return
    }

    setLoadingClients(true)
    const supabase = getSupabaseBrowser()

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email, phone')
        .or(`full_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

      setClients(data || [])
    } catch (error) {
      console.error('Error searching clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = getSupabaseBrowser()

    try {
      // Calcular hora de fin
      const startTime = parse(formData.start_time, 'HH:mm', new Date())
      const endTime = addMinutes(startTime, formData.duration_minutes)

      // Verificar disponibilidad (excluyendo la reserva actual)
      const { data: isAvailable } = await supabase
        .rpc('check_treatment_room_availability', {
          p_room_id: roomId,
          p_date: booking.booking_date,
          p_start_time: formData.start_time,
          p_end_time: format(endTime, 'HH:mm'),
          p_exclude_booking_id: booking.id
        })

      if (!isAvailable) {
        alert('El horario seleccionado no está disponible')
        return
      }

      // Actualizar la reserva
      const { error } = await supabase
        .from('treatment_room_bookings')
        .update({
          service_type: serviceType,
          service_id: formData.service_id,
          sub_service_id: formData.sub_service_id || null,
          professional_id: formData.professional_id,
          client_id: formData.client_id,
          start_time: formData.start_time,
          end_time: format(endTime, 'HH:mm'),
          duration_minutes: formData.duration_minutes,
          notes: formData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (error) throw error

      // Si hay appointment asociado, actualizarlo también
      if (booking.appointment_id) {
        await supabase
          .from('appointments')
          .update({
            service_id: formData.service_id,
            sub_service_id: formData.sub_service_id || null,
            professional_id: formData.professional_id,
            user_id: formData.client_id,
            appointment_time: formData.start_time,
            end_time: format(endTime, 'HH:mm'),
            duration: formData.duration_minutes,
            notes: formData.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.appointment_id)
      }

      onSuccess()
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('Error al actualizar la reserva')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Editar Reserva - {format(new Date(booking.booking_date), "d 'de' MMMM yyyy", { locale: es })}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Sub-servicio */}
          <div>
            <label htmlFor="sub_service_id" className="block text-sm font-medium text-gray-700 mb-1">
              Servicio Específico
            </label>
            <select
              id="sub_service_id"
              value={formData.sub_service_id}
              onChange={(e) => {
                const subService = subServices.find(s => s.id === e.target.value)
                if (subService) {
                  setServiceType(subService.service_type)
                  setFormData(prev => ({
                    ...prev,
                    service_id: subService.service_id,
                    sub_service_id: e.target.value,
                    duration_minutes: subService.duration_minutes || 60
                  }))
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              required
            >
              <option value="">Seleccionar servicio</option>
              {subServices.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.display_name} - {sub.duration_minutes} min
                </option>
              ))}
            </select>
            
            {/* Mostrar tipo de servicio seleccionado */}
            {formData.sub_service_id && (
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  serviceType === 'facial' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-pink-100 text-pink-800'
                }`}>
                  {serviceType === 'facial' ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Facial</span>
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4" />
                      <span>Masaje</span>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchClient}
                onChange={(e) => {
                  setSearchClient(e.target.value)
                  searchClients(e.target.value)
                }}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
              {loadingClients && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
              )}
            </div>
            
            {clients.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {clients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, client_id: client.id }))
                      setSearchClient(client.full_name || `${client.first_name} ${client.last_name}`)
                      setClients([])
                    }}
                    className="w-full p-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-gray-900">
                      {client.first_name} {client.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{client.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profesional */}
          <div>
            <label htmlFor="professional_id" className="block text-sm font-medium text-gray-700 mb-1">
              Profesional
            </label>
            <select
              id="professional_id"
              value={formData.professional_id}
              onChange={(e) => setFormData(prev => ({ ...prev, professional_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
              required
            >
              <option value="">Seleccionar profesional</option>
              {professionals.map(prof => (
                <option key={prof.id} value={prof.id}>
                  {prof.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Hora y duración */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                Hora de inicio
              </label>
              <input
                type="time"
                id="start_time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
                required
              />
            </div>
            <div>
              <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
                Duración (minutos)
              </label>
              <input
                type="number"
                id="duration_minutes"
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                min="30"
                max="180"
                step="15"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
                required
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={loading || !formData.client_id || !formData.professional_id || !formData.sub_service_id}
            >
              {loading ? 'Actualizando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}