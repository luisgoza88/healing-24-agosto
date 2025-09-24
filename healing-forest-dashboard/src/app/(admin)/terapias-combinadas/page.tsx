"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { 
  Calendar,
  Clock,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Snowflake,
  Flame,
  Sparkles,
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
  TrendingUp,
  DropletIcon,
  ThermometerSun,
  Waves
} from 'lucide-react'
import { format, addDays, addMinutes, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

interface WellnessRoom {
  id: string
  name: string
  status: string
}

interface WellnessBooking {
  id: string
  room_id: string
  appointment_id: string | null
  service_type: 'cold_bath' | 'infrared_sauna' | 'combined_therapy'
  sub_service_id: string | null
  professional_id: string
  client_id: string
  booking_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  preparation_time_minutes: number
  status: string
  notes: string | null
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
  sub_services?: {
    id: string
    name: string
    price: number
  }
}

interface TimeSlot {
  time: string
  available: boolean
  booking?: WellnessBooking
  isPreparationTime?: boolean
}

export default function TerapiasCombinadasPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookings, setBookings] = useState<WellnessBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<WellnessBooking | null>(null)
  const [showEditBooking, setShowEditBooking] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  
  // Estadísticas
  const [todaySessions, setTodaySessions] = useState(0)
  const [weekSessions, setWeekSessions] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  
  // Estadísticas por tipo de servicio
  const [serviceStats, setServiceStats] = useState({
    cold_bath: { today: 0, week: 0, month: 0 },
    infrared_sauna: { today: 0, week: 0, month: 0 },
    combined_therapy: { today: 0, week: 0, month: 0 }
  })

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
      // Obtener la sala de terapias
      const { data: roomData } = await supabase
        .from('wellness_room')
        .select('*')
        .eq('status', 'available')
        .single()

      if (roomData) {
        setRoomId(roomData.id)

        // Obtener reservas para la fecha seleccionada (solo activas)
        const { data: bookingsData } = await supabase
          .from('wellness_room_bookings')
          .select(`
            *,
            professionals (id, full_name)
          `)
          .eq('room_id', roomData.id)
          .eq('booking_date', format(selectedDate, 'yyyy-MM-dd'))
          .in('status', ['pending', 'confirmed', 'in_progress', 'completed'])
          .order('start_time')
        
        // Cargar los perfiles de los clientes y sub-servicios por separado
        if (bookingsData && bookingsData.length > 0) {
          const clientIds = [...new Set(bookingsData.map(b => b.client_id))]
          const subServiceIds = bookingsData
            .filter(b => b.sub_service_id)
            .map(b => b.sub_service_id)

          // Cargar perfiles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, first_name, last_name, phone, email')
            .in('id', clientIds)
          
          // Cargar sub-servicios si hay
          let subServicesMap = new Map()
          if (subServiceIds.length > 0) {
            const { data: subServices } = await supabase
              .from('sub_services')
              .select('id, name, price')
              .in('id', subServiceIds)
            
            subServicesMap = new Map(subServices?.map(s => [s.id, s]) || [])
          }
          
          // Mapear los datos
          const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])
          
          bookingsData.forEach(booking => {
            booking.profiles = profilesMap.get(booking.client_id)
            if (booking.sub_service_id) {
              booking.sub_services = subServicesMap.get(booking.sub_service_id)
            }
          })
        }

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
      if (!roomId) return

      // Estadísticas generales
      // Sesiones de hoy
      const { data: todayData } = await supabase
        .from('wellness_room_bookings')
        .select('id, service_type')
        .eq('room_id', roomId)
        .eq('booking_date', format(today, 'yyyy-MM-dd'))
        .in('status', ['pending', 'confirmed', 'in_progress', 'completed'])

      setTodaySessions(todayData?.length || 0)

      // Estadísticas por tipo de servicio para hoy
      const todayStats = {
        cold_bath: todayData?.filter(d => d.service_type === 'cold_bath').length || 0,
        infrared_sauna: todayData?.filter(d => d.service_type === 'infrared_sauna').length || 0,
        combined_therapy: todayData?.filter(d => d.service_type === 'combined_therapy').length || 0
      }

      // Sesiones de la semana
      const { data: weekData } = await supabase
        .from('wellness_room_bookings')
        .select('id, service_type')
        .eq('room_id', roomId)
        .gte('booking_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'))
        .in('status', ['pending', 'confirmed', 'in_progress', 'completed'])

      setWeekSessions(weekData?.length || 0)

      // Estadísticas por tipo de servicio para la semana
      const weekStats = {
        cold_bath: weekData?.filter(d => d.service_type === 'cold_bath').length || 0,
        infrared_sauna: weekData?.filter(d => d.service_type === 'infrared_sauna').length || 0,
        combined_therapy: weekData?.filter(d => d.service_type === 'combined_therapy').length || 0
      }

      // Ingresos del mes
      const { data: monthData } = await supabase
        .from('wellness_room_bookings')
        .select('id, service_type, sub_service_id')
        .eq('room_id', roomId)
        .gte('booking_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed')

      // Obtener los IDs de sub-servicios de Medicina Regenerativa
      const { data: regenService } = await supabase
        .from('services')
        .select('id')
        .eq('name', 'Medicina Regenerativa')
        .single()

      if (regenService) {
        const { data: subServices } = await supabase
          .from('sub_services')
          .select('id, name, price')
          .eq('service_id', regenService.id)
          .in('name', ['Baño helado', 'Sauna infrarrojo', 'Baño helado + sauna infrarrojo'])

        const priceMap = new Map()
        subServices?.forEach(sub => {
          if (sub.name === 'Baño helado') priceMap.set('cold_bath', sub.price)
          if (sub.name === 'Sauna infrarrojo') priceMap.set('infrared_sauna', sub.price)
          if (sub.name === 'Baño helado + sauna infrarrojo') priceMap.set('combined_therapy', sub.price)
        })

        const totalIncome = monthData?.reduce((sum, booking) => {
          return sum + (priceMap.get(booking.service_type) || 0)
        }, 0) || 0

        setMonthlyIncome(totalIncome)
      }

      // Estadísticas mensuales por tipo
      const monthStats = {
        cold_bath: monthData?.filter(d => d.service_type === 'cold_bath').length || 0,
        infrared_sauna: monthData?.filter(d => d.service_type === 'infrared_sauna').length || 0,
        combined_therapy: monthData?.filter(d => d.service_type === 'combined_therapy').length || 0
      }

      setServiceStats({
        cold_bath: { today: todayStats.cold_bath, week: weekStats.cold_bath, month: monthStats.cold_bath },
        infrared_sauna: { today: todayStats.infrared_sauna, week: weekStats.infrared_sauna, month: monthStats.infrared_sauna },
        combined_therapy: { today: todayStats.combined_therapy, week: weekStats.combined_therapy, month: monthStats.combined_therapy }
      })
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const getTimeSlots = (): TimeSlot[] => {
    return timeSlots.map(time => {
      const currentTime = parse(time, 'HH:mm', new Date())
      
      // Buscar si este slot es parte de una reserva activa o tiempo de preparación
      let activeBooking: WellnessBooking | undefined
      let isPreparationTime = false
      let isBlocked = false
      
      for (const booking of bookings) {
        const bookingStart = parse(booking.start_time.slice(0, 5), 'HH:mm', new Date())
        const bookingEnd = parse(booking.end_time.slice(0, 5), 'HH:mm', new Date())
        const prepTime = booking.preparation_time_minutes || 15
        
        // Solo aplicar tiempo de preparación DESPUÉS de la sesión
        const prepEndTime = addMinutes(bookingEnd, prepTime)
        
        // Verificar si está en el rango de la sesión activa
        if (currentTime >= bookingStart && currentTime < bookingEnd) {
          isBlocked = true
          activeBooking = booking
          break
        }
        
        // Verificar si está en el tiempo de preparación DESPUÉS de la sesión
        if (currentTime >= bookingEnd && currentTime < prepEndTime) {
          isBlocked = true
          isPreparationTime = true
          break
        }
      }

      return {
        time,
        available: !isBlocked,
        booking: activeBooking,
        isPreparationTime
      }
    })
  }

  const getServiceIcon = (type: 'cold_bath' | 'infrared_sauna' | 'combined_therapy') => {
    switch (type) {
      case 'cold_bath':
        return <Snowflake className="h-4 w-4" />
      case 'infrared_sauna':
        return <Flame className="h-4 w-4" />
      case 'combined_therapy':
        return <Waves className="h-4 w-4" />
    }
  }

  const getServiceName = (type: 'cold_bath' | 'infrared_sauna' | 'combined_therapy') => {
    switch (type) {
      case 'cold_bath':
        return 'Baño helado'
      case 'infrared_sauna':
        return 'Sauna infrarrojo'
      case 'combined_therapy':
        return 'Terapia combinada'
    }
  }

  const getServiceColor = (type: 'cold_bath' | 'infrared_sauna' | 'combined_therapy') => {
    switch (type) {
      case 'cold_bath':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'infrared_sauna':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'combined_therapy':
        return 'bg-purple-100 text-purple-800 border-purple-300'
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return

    const supabase = getSupabaseBrowser()
    
    try {
      const { error } = await supabase
        .from('wellness_room_bookings')
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
          <h1 className="text-2xl font-semibold text-gray-900">Terapias Combinadas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de baño helado, sauna infrarrojo y terapia combinada
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

      {/* Estadísticas generales */}
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

      {/* Estadísticas por servicio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Snowflake className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900">Baño Helado</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Hoy</p>
              <p className="text-lg font-semibold text-gray-900">{serviceStats.cold_bath.today}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Semana</p>
              <p className="text-lg font-semibold text-gray-900">{serviceStats.cold_bath.week}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Mes</p>
              <p className="text-lg font-semibold text-gray-900">{serviceStats.cold_bath.month}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="font-medium text-gray-900">Sauna Infrarrojo</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Hoy</p>
              <p className="text-lg font-semibold text-gray-900">{serviceStats.infrared_sauna.today}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Semana</p>
              <p className="text-lg font-semibold text-gray-900">{serviceStats.infrared_sauna.week}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Mes</p>
              <p className="text-lg font-semibold text-gray-900">{serviceStats.infrared_sauna.month}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Waves className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900">Terapia Combinada</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Hoy</p>
              <p className="text-lg font-semibold text-gray-900">{serviceStats.combined_therapy.today}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Semana</p>
              <p className="text-lg font-semibold text-gray-900">{serviceStats.combined_therapy.week}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Mes</p>
              <p className="text-lg font-semibold text-gray-900">{serviceStats.combined_therapy.month}</p>
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
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-gray-600">Ocupado (incluye preparación)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredTimeSlots.map((slot) => {
              const slotColor = slot.booking 
                ? getServiceColor(slot.booking.service_type)
                : slot.isPreparationTime
                ? 'bg-gray-100 text-gray-600 border-gray-300'
                : slot.available
                ? 'bg-white border-gray-200 hover:border-green-500 hover:bg-green-50'
                : 'bg-gray-50 border-gray-100'
              
              return (
                <button
                  key={slot.time}
                  onClick={() => {
                    if (slot.booking) {
                      setSelectedBooking(slot.booking)
                    } else if (slot.available) {
                      setSelectedSlot(slot)
                      setShowNewBooking(true)
                    }
                  }}
                  disabled={!slot.available && !slot.booking}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-center
                    ${slotColor}
                    ${(slot.available || slot.booking) ? 'cursor-pointer' : 'cursor-not-allowed'}
                    ${slot.isPreparationTime ? 'opacity-75' : ''}
                  `}
                >
                  <div className="text-sm font-medium">{slot.time}</div>
                  {slot.booking && (
                    <div className="mt-1">
                      {getServiceIcon(slot.booking.service_type)}
                    </div>
                  )}
                  {slot.isPreparationTime && (
                    <div className="mt-1 text-xs">
                      Preparación
                    </div>
                  )}
                </button>
              )
            })}
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
                <span>{getServiceName(selectedBooking.service_type)}</span>
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
                      {selectedBooking.start_time.slice(0, 5)} - {selectedBooking.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duración</p>
                    <p className="font-medium text-gray-900">
                      {selectedBooking.duration_minutes} minutos
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Precio</p>
                    <p className="font-medium text-gray-900">
                      ${selectedBooking.sub_services?.price?.toLocaleString('es-CO') || 0}
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
                    setSelectedBooking(null)
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
      {showNewBooking && roomId && (
        <NewBookingModal
          roomId={roomId}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          bookings={bookings}
          onClose={() => {
            setShowNewBooking(false)
            setSelectedSlot(null)
          }}
          onSuccess={() => {
            setShowNewBooking(false)
            setSelectedSlot(null)
            fetchRoomAndBookings()
            fetchStatistics()
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
            fetchStatistics()
          }}
        />
      )}
    </div>
  )
}

// Componente para nueva reserva
interface NewBookingModalProps {
  roomId: string
  selectedDate: Date
  selectedSlot: TimeSlot | null
  bookings: WellnessBooking[]
  onClose: () => void
  onSuccess: () => void
}

function NewBookingModal({ roomId, selectedDate, selectedSlot, bookings, onClose, onSuccess }: NewBookingModalProps) {
  const [professionals, setProfessionals] = useState<any[]>([])
  const [subServices, setSubServices] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [searchClient, setSearchClient] = useState('')
  const [loadingClients, setLoadingClients] = useState(false)
  const [formData, setFormData] = useState({
    professional_id: '',
    service_type: 'cold_bath' as 'cold_bath' | 'infrared_sauna' | 'combined_therapy',
    client_id: '',
    start_time: selectedSlot?.time || '09:00',
    duration_minutes: 30,
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProfessionals()
    loadSubServices()
  }, [])

  const getServiceName = (type: 'cold_bath' | 'infrared_sauna' | 'combined_therapy') => {
    switch (type) {
      case 'cold_bath':
        return 'Baño helado'
      case 'infrared_sauna':
        return 'Sauna infrarrojo'
      case 'combined_therapy':
        return 'Terapia combinada'
    }
  }

  useEffect(() => {
    // Actualizar duración cuando cambia el tipo de servicio
    const durations = {
      cold_bath: 30,
      infrared_sauna: 45,
      combined_therapy: 60
    }
    setFormData(prev => ({ ...prev, duration_minutes: durations[formData.service_type] }))
  }, [formData.service_type])

  const loadProfessionals = async () => {
    const supabase = getSupabaseBrowser()
    
    const { data } = await supabase
      .from('professionals')
      .select('*')
      .eq('active', true)
      .order('full_name')

    setProfessionals(data || [])
  }

  const loadSubServices = async () => {
    const supabase = getSupabaseBrowser()
    
    // Obtener el servicio de Medicina Regenerativa
    const { data: serviceData } = await supabase
      .from('services')
      .select('id')
      .eq('name', 'Medicina Regenerativa')
      .single()

    if (serviceData) {
      // Obtener los sub-servicios específicos
      const { data: subServicesData } = await supabase
        .from('sub_services')
        .select('*')
        .eq('service_id', serviceData.id)
        .in('name', ['Baño helado', 'Sauna infrarrojo', 'Baño helado + sauna infrarrojo'])
        .eq('active', true)

      setSubServices(subServicesData || [])
    }
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

  const getSubServiceId = (serviceType: string) => {
    const nameMap = {
      'cold_bath': 'Baño helado',
      'infrared_sauna': 'Sauna infrarrojo',
      'combined_therapy': 'Baño helado + sauna infrarrojo'
    }
    const subService = subServices.find(s => s.name === nameMap[serviceType])
    return subService?.id || null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = getSupabaseBrowser()

    try {
      // Calcular hora de fin
      const startTime = parse(formData.start_time, 'HH:mm', new Date())
      const endTime = addMinutes(startTime, formData.duration_minutes)

      // Obtener el sub_service_id correspondiente
      const subServiceId = getSubServiceId(formData.service_type)

      // Verificar disponibilidad antes de crear
      console.log('Intentando crear reserva:', {
        fecha: format(selectedDate, 'yyyy-MM-dd'),
        horaInicio: formData.start_time,
        horaFin: format(endTime, 'HH:mm'),
        servicio: formData.service_type,
        duracion: formData.duration_minutes,
        conPreparacion: `${format(addMinutes(parse(formData.start_time, 'HH:mm', new Date()), -15), 'HH:mm')} - ${format(addMinutes(endTime, 15), 'HH:mm')}`
      })

      // Crear la reserva
      const { data: bookingData, error: bookingError } = await supabase
        .from('wellness_room_bookings')
        .insert({
          room_id: roomId,
          service_type: formData.service_type,
          sub_service_id: subServiceId,
          professional_id: formData.professional_id,
          client_id: formData.client_id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: formData.start_time,
          end_time: format(endTime, 'HH:mm'),
          duration_minutes: formData.duration_minutes,
          preparation_time_minutes: 15,
          status: 'confirmed',
          notes: formData.notes
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // También crear una cita en appointments para sincronización
      const subService = subServices.find(s => s.id === subServiceId)
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: formData.client_id,
          service_id: subService?.service_id,
          sub_service_id: subServiceId,
          professional_id: formData.professional_id,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: formData.start_time,
          end_time: format(endTime, 'HH:mm'),
          duration: formData.duration_minutes,
          status: 'confirmed',
          total_amount: subService?.price || 0,
          notes: formData.notes,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (appointmentError) {
        console.error('Error creating appointment:', appointmentError)
      } else if (appointmentData) {
        // Actualizar wellness_room_booking con el appointment_id
        await supabase
          .from('wellness_room_bookings')
          .update({ appointment_id: appointmentData.id })
          .eq('id', bookingData.id)
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error creating booking:', error)
      
      // Mostrar mensaje de error más específico
      if (error.code === 'P0001' && error.message.includes('sala ya está reservada')) {
        // Buscar reservas cercanas para dar más contexto
        const startTime = parse(formData.start_time, 'HH:mm', new Date())
        const nearbyBookings = bookings.filter(b => {
          const bookingDate = b.booking_date === format(selectedDate, 'yyyy-MM-dd')
          if (!bookingDate) return false
          
          const bookingStart = parse(b.start_time.slice(0, 5), 'HH:mm', new Date())
          const diffMinutes = Math.abs((bookingStart.getTime() - startTime.getTime()) / (1000 * 60))
          
          return diffMinutes <= 120 // Mostrar reservas dentro de 2 horas
        })
        
        let conflictInfo = ''
        if (nearbyBookings.length > 0) {
          conflictInfo = '\n\nReservas cercanas:'
          nearbyBookings.forEach(b => {
            const prepMinutes = b.preparation_time_minutes || 15
            const blockEnd = format(addMinutes(parse(b.end_time.slice(0, 5), 'HH:mm', new Date()), prepMinutes), 'HH:mm')
            conflictInfo += `\n- ${b.start_time.slice(0, 5)} a ${b.end_time.slice(0, 5)} (${getServiceName(b.service_type)})`
            conflictInfo += `\n  Bloquea hasta: ${blockEnd} (incluye ${prepMinutes} min de limpieza)`
          })
        }
        
        alert(`La sala ya está reservada en ese horario. Por favor, selecciona otro horario disponible.\n\nRecuerda que se incluyen 15 minutos de limpieza después de cada sesión.${conflictInfo}`)
      } else {
        alert('Error al crear la reserva. Por favor, intenta nuevamente.')
      }
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

          {/* Tipo de servicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Servicio
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, service_type: 'cold_bath' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.service_type === 'cold_bath'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Snowflake className="h-6 w-6 text-blue-600" />
                  <span className="text-sm font-medium">Baño helado</span>
                  <span className="text-xs text-gray-500">30 min - $80,000</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, service_type: 'infrared_sauna' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.service_type === 'infrared_sauna'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Flame className="h-6 w-6 text-orange-600" />
                  <span className="text-sm font-medium">Sauna infrarrojo</span>
                  <span className="text-xs text-gray-500">45 min - $130,000</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, service_type: 'combined_therapy' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.service_type === 'combined_therapy'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Waves className="h-6 w-6 text-purple-600" />
                  <span className="text-sm font-medium">Terapia combinada</span>
                  <span className="text-xs text-gray-500">60 min - $190,000</span>
                </div>
              </button>
            </div>
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

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Tiempo de preparación incluido</p>
                <p>Se bloquearán 15 minutos adicionales antes y después de la sesión para limpieza y preparación.</p>
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
              {loading ? 'Creando...' : 'Crear Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente para editar reserva
interface EditBookingModalProps {
  booking: WellnessBooking
  roomId: string
  onClose: () => void
  onSuccess: () => void
}

function EditBookingModal({ booking, roomId, onClose, onSuccess }: EditBookingModalProps) {
  const [professionals, setProfessionals] = useState<any[]>([])
  const [formData, setFormData] = useState({
    professional_id: booking.professional_id,
    service_type: booking.service_type,
    start_time: booking.start_time.slice(0, 5),
    duration_minutes: booking.duration_minutes,
    notes: booking.notes || ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProfessionals()
  }, [])

  useEffect(() => {
    // Actualizar duración cuando cambia el tipo de servicio
    const durations = {
      cold_bath: 30,
      infrared_sauna: 45,
      combined_therapy: 60
    }
    setFormData(prev => ({ ...prev, duration_minutes: durations[formData.service_type] }))
  }, [formData.service_type])

  const loadProfessionals = async () => {
    const supabase = getSupabaseBrowser()
    
    const { data } = await supabase
      .from('professionals')
      .select('*')
      .eq('active', true)
      .order('full_name')

    setProfessionals(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = getSupabaseBrowser()

    try {
      // Calcular hora de fin
      const startTime = parse(formData.start_time, 'HH:mm', new Date())
      const endTime = addMinutes(startTime, formData.duration_minutes)

      // Actualizar la reserva
      const { error } = await supabase
        .from('wellness_room_bookings')
        .update({
          service_type: formData.service_type,
          professional_id: formData.professional_id,
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
            professional_id: formData.professional_id,
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

  const clientName = booking.profiles?.first_name && booking.profiles?.last_name
    ? `${booking.profiles.first_name} ${booking.profiles.last_name}`
    : booking.profiles?.full_name || 'Sin nombre'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Editar Reserva
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
          {/* Información del cliente (solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-900">{clientName}</p>
              {booking.profiles?.email && (
                <p className="text-sm text-gray-500">{booking.profiles.email}</p>
              )}
            </div>
          </div>

          {/* Tipo de servicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Servicio
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, service_type: 'cold_bath' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.service_type === 'cold_bath'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Snowflake className="h-6 w-6 text-blue-600" />
                  <span className="text-sm font-medium">Baño helado</span>
                  <span className="text-xs text-gray-500">30 min</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, service_type: 'infrared_sauna' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.service_type === 'infrared_sauna'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Flame className="h-6 w-6 text-orange-600" />
                  <span className="text-sm font-medium">Sauna infrarrojo</span>
                  <span className="text-xs text-gray-500">45 min</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, service_type: 'combined_therapy' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.service_type === 'combined_therapy'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Waves className="h-6 w-6 text-purple-600" />
                  <span className="text-sm font-medium">Terapia combinada</span>
                  <span className="text-xs text-gray-500">60 min</span>
                </div>
              </button>
            </div>
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
              disabled={loading || !formData.professional_id}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}