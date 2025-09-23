"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  Filter,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Heart,
  Activity,
  BarChart,
  CalendarDays,
  CalendarRange
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, addMinutes, parse, isAfter, isBefore, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface HyperbaricAppointment {
  id: string
  user_id: string
  service_id: string
  professional_id: string
  appointment_date: string
  appointment_time: string
  end_time: string
  duration_minutes: number
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  hyperbaric_chamber_id: string
  profiles: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    phone: string | null
  }
  services: {
    id: string
    name: string
    duration_minutes: number
    base_price: number
  }
  professionals: {
    id: string
    full_name: string
  }
}

type ViewMode = 'day' | 'week' | 'month'

export default function CamaraHiperbaricaPage() {
  const [appointments, setAppointments] = useState<HyperbaricAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<HyperbaricAppointment | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [stats, setStats] = useState({
    todaySessions: 0,
    weekSessions: 0,
    monthRevenue: 0
  })

  // Calcular fechas según el modo de vista
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return { start: currentDate, end: currentDate }
      case 'week':
        return { 
          start: startOfWeek(currentDate, { weekStartsOn: 1, locale: es }), 
          end: endOfWeek(currentDate, { weekStartsOn: 1, locale: es }) 
        }
      case 'month':
        return { 
          start: startOfMonth(currentDate), 
          end: endOfMonth(currentDate) 
        }
    }
  }

  const dateRange = getDateRange()
  const displayDays = viewMode === 'day' 
    ? [currentDate] 
    : eachDayOfInterval({ start: dateRange.start, end: dateRange.end })

  // Horarios de 8 AM a 6 PM cada 15 minutos (última sesión)
  const timeSlots = []
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      timeSlots.push(time)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentDate, viewMode]) // Usar currentDate y viewMode como dependencias en lugar de dateRange

  const fetchData = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Obtener citas del rango de fechas - ahora solo necesitamos verificar hyperbaric_chamber_id
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .not('hyperbaric_chamber_id', 'is', null)
        .gte('appointment_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('appointment_date', format(dateRange.end, 'yyyy-MM-dd'))
        .in('status', ['confirmed', 'in_progress', 'completed'])
        .order('appointment_date')
        .order('appointment_time')

      if (appointmentsError) throw appointmentsError

      // Si hay citas, obtener los datos relacionados
      if (appointmentsData && appointmentsData.length > 0) {
        // Obtener IDs únicos
        const userIds = [...new Set(appointmentsData.map(apt => apt.user_id))].filter(Boolean)
        const serviceIds = [...new Set(appointmentsData.map(apt => apt.service_id))].filter(Boolean)
        const professionalIds = [...new Set(appointmentsData.map(apt => apt.professional_id))].filter(Boolean)

        // Obtener profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, phone')
          .in('id', userIds)

        // Obtener services
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, duration_minutes, base_price')
          .in('id', serviceIds)

        // Obtener professionals
        const { data: professionalsData } = await supabase
          .from('professionals')
          .select('id, full_name')
          .in('id', professionalIds)

        // Crear mapas para acceso rápido
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
        const servicesMap = new Map(servicesData?.map(s => [s.id, s]) || [])
        const professionalsMap = new Map(professionalsData?.map(p => [p.id, p]) || [])

        // Combinar los datos - ya no necesitamos filtrar porque la consulta ya filtra por hyperbaric_chamber_id
        const appointmentsWithRelations = appointmentsData
          .map(apt => ({
            ...apt,
            profiles: profilesMap.get(apt.user_id) || null,
            services: servicesMap.get(apt.service_id) || null,
            professionals: professionalsMap.get(apt.professional_id) || null
          }))

        setAppointments(appointmentsWithRelations)

        // Calcular estadísticas
        const today = format(new Date(), 'yyyy-MM-dd')
        const todayAppointments = appointmentsWithRelations.filter(apt => 
          apt.appointment_date === today && apt.status !== 'cancelled'
        )
        const weekAppointments = appointmentsWithRelations.filter(apt => 
          apt.status !== 'cancelled'
        )
        const monthRevenue = appointmentsWithRelations
          .filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + (apt.services?.base_price || 0), 0)

        setStats({
          todaySessions: todayAppointments.length,
          weekSessions: weekAppointments.length,
          monthRevenue
        })
      } else {
        setAppointments([])
        setStats({ todaySessions: 0, weekSessions: 0, monthRevenue: 0 })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm(`¿Estás seguro de cancelar esta sesión?\\n\\nEsta acción no se puede deshacer.`)) return

    const supabase = getSupabaseBrowser()
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelado por administrador'
        })
        .eq('id', appointmentId)

      if (error) throw error

      fetchData()
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Error al cancelar la sesión. Por favor intenta de nuevo.')
    }
  }

  const getAppointmentForDayAndTime = (day: Date, timeSlot: string) => {
    return appointments.find(apt => {
      const aptDate = new Date(apt.appointment_date + 'T00:00:00')
      if (!isSameDay(aptDate, day)) return false
      
      const slotTime = parse(timeSlot, 'HH:mm', new Date())
      const aptStart = parse(apt.appointment_time.slice(0, 5), 'HH:mm', new Date())
      const aptEnd = parse(apt.end_time.slice(0, 5), 'HH:mm', new Date())
      
      // Un slot está ocupado si está entre el inicio (inclusive) y el fin (exclusive) de la cita
      return (isAfter(slotTime, aptStart) || format(slotTime, 'HH:mm') === format(aptStart, 'HH:mm')) && 
             isBefore(slotTime, aptEnd)
    })
  }

  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 1)))
        break
      case 'week':
        setCurrentDate(prev => subWeeks(prev, 1))
        break
      case 'month':
        setCurrentDate(prev => subMonths(prev, 1))
        break
    }
  }

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 1)))
        break
      case 'week':
        setCurrentDate(prev => addWeeks(prev, 1))
        break
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1))
        break
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const isPastSlot = (date: Date, timeSlot: string) => {
    const now = new Date()
    const slotDateTime = parse(`${format(date, 'yyyy-MM-dd')} ${timeSlot}`, 'yyyy-MM-dd HH:mm', new Date())
    return isAfter(now, slotDateTime)
  }

  const filteredAppointments = appointments.filter(apt => {
    const clientName = `${apt.profiles?.first_name || ''} ${apt.profiles?.last_name || apt.profiles?.full_name || ''}`.toLowerCase()
    const professionalName = apt.professionals?.full_name?.toLowerCase() || ''
    
    const matchesSearch = searchTerm === '' || 
      clientName.includes(searchTerm.toLowerCase()) ||
      professionalName.includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando cámara hiperbárica...</div>
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
        <div className="flex items-center gap-3">
          <Link
            href="/camara-hiperbarica/nueva"
            className="flex items-center gap-2 px-6 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl font-medium"
          >
            <Plus className="h-5 w-5" />
            Nueva Sesión
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sesiones Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todaySessions}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sesiones {viewMode === 'week' ? 'Semana' : 'Mes'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.weekSessions}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Heart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos {viewMode === 'month' ? 'Mes' : 'Período'}</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.monthRevenue.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* View Mode Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'day' 
                  ? 'bg-hf-primary text-white' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Vista por día"
            >
              <Calendar className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'week' 
                  ? 'bg-hf-primary text-white' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Vista semanal"
            >
              <CalendarDays className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'month' 
                  ? 'bg-hf-primary text-white' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Vista mensual"
            >
              <CalendarRange className="h-5 w-5" />
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 ml-2">
              {viewMode === 'day' && format(currentDate, 'EEEE d \'de\' MMMM, yyyy', { locale: es })}
              {viewMode === 'week' && `${format(dateRange.start, 'dd MMM', { locale: es })} - ${format(dateRange.end, 'dd MMM yyyy', { locale: es })}`}
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: es })}
            </span>
          </div>

          <div className="flex-1 flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar paciente o profesional..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hora
                </th>
                {viewMode === 'month' ? (
                  // Vista mensual compacta
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sesiones Programadas
                  </th>
                ) : (
                  // Vista día/semana
                  displayDays.map((day, index) => (
                    <th
                      key={index}
                      className={`px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        isSameDay(day, new Date()) ? 'bg-hf-primary/5' : ''
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {format(day, 'EEEE', { locale: es })}
                      </div>
                      <div className={`text-lg font-semibold ${
                        isSameDay(day, new Date()) ? 'text-hf-primary' : 'text-gray-700'
                      }`}>
                        {format(day, 'd')}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {viewMode === 'month' ? (
                // Vista mensual - mostrar resumen
                <tr>
                  <td colSpan={2} className="px-6 py-4">
                    <div className="space-y-2">
                      {filteredAppointments.length > 0 ? (
                        filteredAppointments.map(apt => (
                          <div
                            key={apt.id}
                            className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => {
                              setSelectedAppointment(apt)
                              setShowDetails(true)
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {format(new Date(apt.appointment_date), 'dd \'de\' MMMM', { locale: es })}
                                </div>
                                <div className="text-gray-600">
                                  {apt.appointment_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}
                                </div>
                              </div>
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {apt.profiles?.first_name || apt.profiles?.full_name || 'Paciente'}
                                </div>
                                <div className="text-gray-600">
                                  {apt.professionals?.full_name}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              ${apt.services?.base_price?.toLocaleString('es-CO') || '0'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">
                          No hay sesiones programadas este mes
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // Vista día/semana
                timeSlots.map((timeSlot, timeIndex) => {
                  // Check if any appointment starts at this time
                  const hasAppointmentStart = displayDays.some(day => 
                    appointments.some(apt => {
                      const aptDate = new Date(apt.appointment_date + 'T00:00:00')
                      return isSameDay(aptDate, day) && apt.appointment_time.slice(0, 5) === timeSlot
                    })
                  )

                  return (
                    <tr key={timeIndex} className={`hover:bg-gray-50 ${hasAppointmentStart ? 'border-t-2 border-gray-300' : ''}`}>
                      <td className="sticky left-0 bg-white px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700 border-r border-gray-200">
                        {timeSlot}
                      </td>
                      {displayDays.map((day, dayIndex) => {
                        const isPast = isPastSlot(day, timeSlot)
                        const apt = getAppointmentForDayAndTime(day, timeSlot)
                        
                        return (
                          <td
                            key={dayIndex}
                            className={`px-2 py-2 ${
                              isSameDay(day, new Date()) ? 'bg-hf-primary/5' : ''
                            } ${isPast ? 'bg-gray-50' : ''} ${apt ? 'bg-blue-100 border-blue-200' : ''}`}
                          >
                            {apt ? (
                              <div
                                className="text-xs cursor-pointer hover:opacity-80 p-1"
                                onClick={() => {
                                  setSelectedAppointment(apt)
                                  setShowDetails(true)
                                }}
                              >
                                {apt.appointment_time.slice(0, 5) === timeSlot ? (
                                  <>
                                    <div className="font-medium text-blue-900">
                                      {apt.profiles?.first_name || apt.profiles?.full_name || 'Paciente'}
                                    </div>
                                    <div className="text-blue-700">
                                      {apt.professionals?.full_name}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center py-1">
                                    {/* Slot ocupado pero no es el inicio */}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div 
                                className={`text-xs text-center p-2 ${
                                  isPast ? 'text-gray-400' : 'text-gray-500 hover:bg-gray-100 cursor-pointer'
                                }`}
                                onClick={() => {
                                  if (!isPast && timeSlot <= '18:00') {
                                    window.location.href = `/camara-hiperbarica/nueva?date=${format(day, 'yyyy-MM-dd')}&time=${timeSlot}`
                                  }
                                }}
                              >
                                {isPast ? '-' : (timeSlot > '18:00' ? '-' : 'Disponible')}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {showDetails && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Sesión de Cámara Hiperbárica
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(selectedAppointment.appointment_date), 'dd \'de\' MMMM, yyyy', { locale: es })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/camara-hiperbarica/${selectedAppointment.id}/editar`}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Link>
                  <button
                    onClick={() => {
                      handleDeleteAppointment(selectedAppointment.id)
                      setShowDetails(false)
                      setSelectedAppointment(null)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setShowDetails(false)
                      setSelectedAppointment(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Client Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Paciente
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nombre:</span>
                    <p className="font-medium">
                      {selectedAppointment.profiles?.first_name && selectedAppointment.profiles?.last_name
                        ? `${selectedAppointment.profiles.first_name} ${selectedAppointment.profiles.last_name}`
                        : selectedAppointment.profiles?.full_name || 'Sin nombre'}
                    </p>
                  </div>
                  {selectedAppointment.profiles?.phone && (
                    <div>
                      <span className="text-gray-500">Teléfono:</span>
                      <p className="font-medium">{selectedAppointment.profiles.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm text-gray-500">Horario</span>
                  <p className="font-medium text-gray-900">
                    {selectedAppointment.appointment_time.slice(0, 5)} - {selectedAppointment.end_time.slice(0, 5)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ({selectedAppointment.duration_minutes} minutos)
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm text-gray-500">Enfermera</span>
                  <p className="font-medium text-gray-900">
                    {selectedAppointment.professionals?.full_name}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-500">Precio</span>
                <p className="font-medium text-gray-900 text-lg">
                  ${(selectedAppointment.services?.base_price || 0).toLocaleString('es-CO')} COP
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Estado:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedAppointment.status === 'confirmed' 
                    ? 'bg-blue-100 text-blue-700'
                    : selectedAppointment.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {selectedAppointment.status === 'confirmed' ? 'Confirmada' :
                   selectedAppointment.status === 'in_progress' ? 'En progreso' : 'Completada'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}