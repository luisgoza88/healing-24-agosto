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
  Heart,
  Edit,
  Trash2,
  AlertCircle,
  X,
  Search,
  Loader2,
  Activity,
  CalendarDays,
  TrendingUp,
  Users
} from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addMinutes, parse, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface HyperbaricBooking {
  id: string
  user_id: string
  service_id: string
  professional_id: string
  appointment_date: string
  appointment_time: string
  end_time: string
  duration: number
  status: string
  hyperbaric_chamber_id: string
  total_amount?: number
  profiles?: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    phone: string | null
    email: string | null
  }
  professionals?: {
    id: string
    full_name: string
  }
}

interface TimeSlot {
  time: string
  available: boolean
  booking?: HyperbaricBooking
}

export default function CamaraHiperbaricaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookings, setBookings] = useState<HyperbaricBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<HyperbaricBooking | null>(null)
  const [chamberId, setChamberId] = useState<string | null>(null)
  
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
    fetchChamberAndBookings()
    fetchStatistics()
  }, [selectedDate])

  const fetchChamberAndBookings = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowser()

    try {
      // Obtener la cámara hiperbárica
      const { data: chamberData } = await supabase
        .from('hyperbaric_chambers')
        .select('id')
        .eq('status', 'available')
        .single()

      if (chamberData) {
        setChamberId(chamberData.id)

        // Obtener reservas para la fecha seleccionada
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select(`
            id,
            user_id,
            service_id,
            professional_id,
            appointment_date,
            appointment_time,
            end_time,
            duration,
            status,
            hyperbaric_chamber_id,
            total_amount,
            professionals (id, full_name)
          `)
          .eq('hyperbaric_chamber_id', chamberData.id)
          .eq('appointment_date', format(selectedDate, 'yyyy-MM-dd'))
          .neq('status', 'cancelled')
          .order('appointment_time')
        
        // Cargar los perfiles de los usuarios por separado
        if (appointmentsData && appointmentsData.length > 0) {
          const userIds = [...new Set(appointmentsData.map(apt => apt.user_id))]
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, first_name, last_name, phone, email')
            .in('id', userIds)
          
          // Mapear los perfiles a las citas
          const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])
          appointmentsData.forEach(apt => {
            apt.profiles = profilesMap.get(apt.user_id) || null
          })
        }

        setBookings(appointmentsData || [])
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
        .from('appointments')
        .select('id')
        .not('hyperbaric_chamber_id', 'is', null)
        .eq('appointment_date', format(today, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')

      setTodaySessions(todayData?.length || 0)

      // Sesiones de la semana
      const { data: weekData } = await supabase
        .from('appointments')
        .select('id')
        .not('hyperbaric_chamber_id', 'is', null)
        .gte('appointment_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(weekEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')

      setWeekSessions(weekData?.length || 0)

      // Ingresos del mes
      const { data: monthData } = await supabase
        .from('appointments')
        .select('total_amount')
        .not('hyperbaric_chamber_id', 'is', null)
        .gte('appointment_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed')

      const totalIncome = monthData?.reduce((sum, appointment) => sum + (appointment.total_amount || 0), 0) || 0
      setMonthlyIncome(totalIncome)
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const getTimeSlots = (): TimeSlot[] => {
    return timeSlots.map(time => {
      const booking = bookings.find(b => {
        const bookingStart = b.appointment_time.slice(0, 5)
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

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta sesión?')) return

    const supabase = getSupabaseBrowser()
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      fetchChamberAndBookings()
      fetchStatistics()
      setSelectedBooking(null)
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Error al cancelar la sesión')
    }
  }

  const filteredTimeSlots = getTimeSlots()

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
          <h1 className="text-2xl font-semibold text-gray-900">Cámara Hiperbárica</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de sesiones de oxigenoterapia hiperbárica
          </p>
        </div>
        <button
          onClick={() => setShowNewBooking(true)}
          className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nueva Sesión
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

      {/* Date Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(prev => addDays(prev, -1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="px-4 py-2 bg-gray-50 rounded-lg flex-1 text-center">
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
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Reservado</span>
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
                  p-3 rounded-lg border-2 transition-all text-center
                  ${slot.available 
                    ? 'border-gray-200 hover:border-green-500 hover:bg-green-50' 
                    : 'border-blue-200 bg-blue-50 hover:border-blue-300'
                  }
                `}
              >
                <div className="text-sm font-medium text-gray-900">{slot.time}</div>
                {slot.booking && (
                  <div className="mt-1 text-xs text-gray-600">
                    Reservado
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
                  Detalles de la Sesión
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <Heart className="h-4 w-4" />
                <span>Cámara Hiperbárica</span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium text-gray-900">
                    {selectedBooking.profiles?.first_name && selectedBooking.profiles?.last_name
                      ? `${selectedBooking.profiles.first_name} ${selectedBooking.profiles.last_name}`
                      : selectedBooking.profiles?.full_name || 'Sin nombre'}
                  </p>
                  {selectedBooking.profiles?.phone && (
                    <p className="text-sm text-gray-600 mt-1">{selectedBooking.profiles.phone}</p>
                  )}
                  {selectedBooking.profiles?.email && (
                    <p className="text-sm text-gray-600">{selectedBooking.profiles.email}</p>
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
                      {selectedBooking.appointment_time.slice(0, 5)} - {selectedBooking.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duración</p>
                    <p className="font-medium text-gray-900">
                      {selectedBooking.duration} minutos
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
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
      {showNewBooking && chamberId && (
        <NewBookingModal
          chamberId={chamberId}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          onClose={() => {
            setShowNewBooking(false)
            setSelectedSlot(null)
          }}
          onSuccess={() => {
            setShowNewBooking(false)
            setSelectedSlot(null)
            fetchChamberAndBookings()
            fetchStatistics()
          }}
        />
      )}
    </div>
  )
}

// Componente para nueva reserva
interface NewBookingModalProps {
  chamberId: string
  selectedDate: Date
  selectedSlot: TimeSlot | null
  onClose: () => void
  onSuccess: () => void
}

function NewBookingModal({ chamberId, selectedDate, selectedSlot, onClose, onSuccess }: NewBookingModalProps) {
  const [professionals, setProfessionals] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [searchClient, setSearchClient] = useState('')
  const [loadingClients, setLoadingClients] = useState(false)
  const [formData, setFormData] = useState({
    professional_id: '',
    client_id: '',
    start_time: selectedSlot?.time || '09:00',
    duration_minutes: 60,
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProfessionals()
  }, [])

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

      // Buscar el service_id para Cámara Hiperbárica
      const { data: serviceData } = await supabase
        .from('services')
        .select('id')
        .eq('name', 'Cámara Hiperbárica')
        .single()

      if (!serviceData) {
        throw new Error('Servicio de Cámara Hiperbárica no encontrado')
      }

      // Crear la cita
      const { error } = await supabase
        .from('appointments')
        .insert({
          user_id: formData.client_id,
          service_id: serviceData.id,
          professional_id: formData.professional_id,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: formData.start_time,
          end_time: format(endTime, 'HH:mm'),
          duration: formData.duration_minutes,
          status: 'confirmed',
          hyperbaric_chamber_id: chamberId,
          notes: formData.notes,
          total_amount: 180000, // Precio fijo para cámara hiperbárica
          created_at: new Date().toISOString()
        })

      if (error) throw error

      onSuccess()
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Error al crear la sesión')
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
              Nueva Sesión - {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
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
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Sesión estándar de 60 minutos</p>
                <p>Precio: $180,000 COP</p>
              </div>
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
              disabled={loading || !formData.client_id || !formData.professional_id}
            >
              {loading ? 'Creando...' : 'Crear Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}