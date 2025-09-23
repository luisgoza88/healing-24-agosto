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
  Stethoscope,
  User,
  Building
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, addMinutes, parse, isAfter, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface ConsultationAppointment {
  id: string
  user_id: string
  service_id: string
  professional_id: string
  appointment_date: string
  appointment_time: string
  end_time: string
  duration_minutes: number
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  consultation_room_id: string
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
  consultation_rooms: {
    id: string
    room_number: number
    name: string
  }
}

interface ConsultationRoom {
  id: string
  room_number: number
  name: string
  status: string
  preferred_professional_id: string | null
}

export default function ConsultoriosPage() {
  const [appointments, setAppointments] = useState<ConsultationAppointment[]>([])
  const [rooms, setRooms] = useState<ConsultationRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterService, setFilterService] = useState<string>('all')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<ConsultationAppointment | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1, locale: es })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1, locale: es })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Horarios de 8 AM a 7 PM cada 15 minutos
  const timeSlots = []
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      timeSlots.push(time)
    }
  }
  // Agregar el último slot de las 6:45 PM
  timeSlots.push('18:45')

  useEffect(() => {
    fetchData()
  }, [currentWeek])

  const fetchData = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Obtener consultorios
      const { data: roomsData, error: roomsError } = await supabase
        .from('consultation_rooms')
        .select('*')
        .eq('status', 'available')
        .order('room_number')

      if (roomsError) throw roomsError
      setRooms(roomsData || [])

      // Obtener IDs de servicios de Medicina Funcional y Medicina Estética
      const { data: consultoriosServices } = await supabase
        .from('services')
        .select('id')
        .in('name', ['Medicina Funcional', 'Medicina Estética'])
      
      const serviceIds = consultoriosServices?.map(s => s.id) || []

      // Obtener citas de la semana - incluir las que tienen consultation_room_id O son de servicios de consultorio
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .or(`consultation_room_id.not.is.null,service_id.in.(${serviceIds.map(id => `"${id}"`).join(',')})`)
        .gte('appointment_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(weekEnd, 'yyyy-MM-dd'))
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
        const roomIds = [...new Set(appointmentsData.map(apt => apt.consultation_room_id))].filter(Boolean)

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

        // Obtener consultation_rooms
        const { data: consultationRoomsData } = await supabase
          .from('consultation_rooms')
          .select('id, room_number, name')
          .in('id', roomIds)

        // Crear mapas para acceso rápido
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
        const servicesMap = new Map(servicesData?.map(s => [s.id, s]) || [])
        const professionalsMap = new Map(professionalsData?.map(p => [p.id, p]) || [])
        const roomsMap = new Map(consultationRoomsData?.map(r => [r.id, r]) || [])

        // Combinar los datos y filtrar solo medicina
        const appointmentsWithRelations = appointmentsData
          .map(apt => ({
            ...apt,
            profiles: profilesMap.get(apt.user_id) || null,
            services: servicesMap.get(apt.service_id) || null,
            professionals: professionalsMap.get(apt.professional_id) || null,
            consultation_rooms: roomsMap.get(apt.consultation_room_id) || null
          }))
          .filter(apt => 
            apt.services?.name?.includes('Medicina') || 
            apt.services?.name?.includes('medicina')
          )

        setAppointments(appointmentsWithRelations)
      } else {
        setAppointments([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAppointment = async (appointmentId: string, serviceName: string) => {
    if (!confirm(`¿Estás seguro de cancelar la cita de "${serviceName}"?\n\nEsta acción no se puede deshacer.`)) return

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
      alert('Error al cancelar la cita. Por favor intenta de nuevo.')
    }
  }

  const getAppointmentsForDayTimeAndRoom = (day: Date, timeSlot: string, roomNumber: number) => {
    return appointments.find(apt => {
      const aptDate = new Date(apt.appointment_date + 'T00:00:00')
      if (!isSameDay(aptDate, day)) return false
      
      // Si tiene consultation_room_id, verificar que coincida
      if (apt.consultation_room_id) {
        if (apt.consultation_rooms?.room_number !== roomNumber) return false
      } else {
        // Si no tiene consultation_room_id (viene de la app móvil), 
        // asignar al consultorio 1 por defecto
        if (roomNumber !== 1) return false
      }
      
      const slotTime = parse(timeSlot, 'HH:mm', new Date())
      const aptStart = parse(apt.appointment_time.slice(0, 5), 'HH:mm', new Date())
      const aptEnd = parse(apt.end_time.slice(0, 5), 'HH:mm', new Date())
      
      // Un slot está ocupado si está entre el inicio (inclusive) y el fin (exclusive) de la cita
      return (isAfter(slotTime, aptStart) || format(slotTime, 'HH:mm') === format(aptStart, 'HH:mm')) && 
             isBefore(slotTime, aptEnd)
    })
  }

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1))
  }

  const handleToday = () => {
    setCurrentWeek(new Date())
  }

  const isPastSlot = (date: Date, timeSlot: string) => {
    const now = new Date()
    const slotDateTime = parse(`${format(date, 'yyyy-MM-dd')} ${timeSlot}`, 'yyyy-MM-dd HH:mm', new Date())
    return isAfter(now, slotDateTime)
  }

  const getServiceColor = (serviceName: string) => {
    if (serviceName?.includes('Funcional')) {
      return 'bg-blue-100 text-blue-700 border-blue-200'
    }
    if (serviceName?.includes('Estética')) {
      return 'bg-purple-100 text-purple-700 border-purple-200'
    }
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getServiceIcon = (serviceName: string) => {
    if (serviceName?.includes('Funcional')) return '🔵'
    if (serviceName?.includes('Estética')) return '🟣'
    return '⚪'
  }

  const filteredAppointments = appointments.filter(apt => {
    const clientName = `${apt.profiles?.first_name || ''} ${apt.profiles?.last_name || apt.profiles?.full_name || ''}`.toLowerCase()
    const serviceName = apt.services?.name?.toLowerCase() || ''
    const professionalName = apt.professionals?.full_name?.toLowerCase() || ''
    
    const matchesSearch = searchTerm === '' || 
      clientName.includes(searchTerm.toLowerCase()) ||
      serviceName.includes(searchTerm.toLowerCase()) ||
      professionalName.includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterService === 'all' || 
      (filterService === 'funcional' && serviceName.includes('funcional')) ||
      (filterService === 'estetica' && serviceName.includes('estética'))
    
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando consultorios...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Consultorios</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de citas para Medicina Funcional y Medicina Estética
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/consultorios/nueva"
            className="flex items-center gap-2 px-6 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl font-medium"
          >
            <Plus className="h-5 w-5" />
            Nueva Cita
          </Link>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousWeek}
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
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 ml-2">
              {format(weekStart, 'dd MMM', { locale: es })} - {format(weekEnd, 'dd MMM yyyy', { locale: es })}
            </span>
          </div>

          <div className="flex-1 flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar paciente, servicio o profesional..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            </div>

            {/* Service Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              >
                <option value="all">Todos los servicios</option>
                <option value="funcional">Medicina Funcional</option>
                <option value="estetica">Medicina Estética</option>
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔵</span>
              <span className="text-gray-600">Med. Funcional</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🟣</span>
              <span className="text-gray-600">Med. Estética</span>
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
                {weekDays.map((day, index) => (
                  <React.Fragment key={index}>
                    <th
                      colSpan={2}
                      className={`px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-300 ${
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
                      <div className="flex gap-2 justify-center mt-1 text-xs">
                        <span>Consultorio 1</span>
                        <span className="text-gray-400">|</span>
                        <span>Consultorio 2</span>
                      </div>
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeSlots.map((timeSlot, timeIndex) => {
                // Check if any room has appointments starting at this time
                const hasAppointmentStart = weekDays.some(day => 
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
                    {weekDays.map((day, dayIndex) => {
                      const isPast = isPastSlot(day, timeSlot)
                      const room1Apt = getAppointmentsForDayTimeAndRoom(day, timeSlot, 1)
                      const room2Apt = getAppointmentsForDayTimeAndRoom(day, timeSlot, 2)
                      
                      return (
                        <React.Fragment key={dayIndex}>
                          {/* Consultorio 1 */}
                          <td
                            className={`px-2 py-2 border-l border-gray-300 ${
                              isSameDay(day, new Date()) ? 'bg-hf-primary/5' : ''
                            } ${isPast ? 'bg-gray-50' : ''} ${room1Apt ? getServiceColor(room1Apt.services?.name || '') : ''}`}
                          >
                            {room1Apt ? (
                              <div
                                className="text-xs cursor-pointer hover:opacity-80 p-1"
                                onClick={() => {
                                  setSelectedAppointment(room1Apt)
                                  setShowDetails(true)
                                }}
                              >
                                {room1Apt.appointment_time.slice(0, 5) === timeSlot ? (
                                  <>
                                    <div className="font-medium flex items-center gap-1">
                                      {getServiceIcon(room1Apt.services?.name || '')}
                                      {room1Apt.profiles?.first_name || room1Apt.profiles?.full_name || 'Paciente'}
                                    </div>
                                    <div className="text-gray-600">{room1Apt.professionals?.full_name}</div>
                                  </>
                                ) : (
                                  <div className="text-center py-1">
                                    {/* Slot ocupado pero no es el inicio */}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div 
                                className={`text-xs text-center p-2 ${isPast ? 'text-gray-400' : 'text-gray-500 hover:bg-gray-100 cursor-pointer'}`}
                                onClick={() => {
                                  if (!isPast) {
                                    window.location.href = `/consultorios/nueva?date=${format(day, 'yyyy-MM-dd')}&time=${timeSlot}&room=1`
                                  }
                                }}
                              >
                                {isPast ? '-' : 'Disponible'}
                              </div>
                            )}
                          </td>
                          
                          {/* Consultorio 2 */}
                          <td
                            className={`px-2 py-2 border-r border-gray-200 ${
                              isSameDay(day, new Date()) ? 'bg-hf-primary/5' : ''
                            } ${isPast ? 'bg-gray-50' : ''} ${room2Apt ? getServiceColor(room2Apt.services?.name || '') : ''}`}
                          >
                            {room2Apt ? (
                              <div
                                className="text-xs cursor-pointer hover:opacity-80 p-1"
                                onClick={() => {
                                  setSelectedAppointment(room2Apt)
                                  setShowDetails(true)
                                }}
                              >
                                {room2Apt.appointment_time.slice(0, 5) === timeSlot ? (
                                  <>
                                    <div className="font-medium flex items-center gap-1">
                                      {getServiceIcon(room2Apt.services?.name || '')}
                                      {room2Apt.profiles?.first_name || room2Apt.profiles?.full_name || 'Paciente'}
                                    </div>
                                    <div className="text-gray-600">{room2Apt.professionals?.full_name}</div>
                                  </>
                                ) : (
                                  <div className="text-center py-1">
                                    {/* Slot ocupado pero no es el inicio */}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div 
                                className={`text-xs text-center p-2 ${isPast ? 'text-gray-400' : 'text-gray-500 hover:bg-gray-100 cursor-pointer'}`}
                                onClick={() => {
                                  if (!isPast) {
                                    window.location.href = `/consultorios/nueva?date=${format(day, 'yyyy-MM-dd')}&time=${timeSlot}&room=2`
                                  }
                                }}
                              >
                                {isPast ? '-' : 'Disponible'}
                              </div>
                            )}
                          </td>
                        </React.Fragment>
                      )
                    })}
                  </tr>
                )
              })}
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
                    {selectedAppointment.services?.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(selectedAppointment.appointment_date), 'dd \'de\' MMMM, yyyy', { locale: es })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/consultorios/${selectedAppointment.id}/editar`}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Link>
                  <button
                    onClick={() => {
                      handleDeleteAppointment(
                        selectedAppointment.id, 
                        selectedAppointment.services?.name || 'Servicio'
                      )
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

              {/* Service Info */}
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
                  <span className="text-sm text-gray-500">Consultorio</span>
                  <p className="font-medium text-gray-900">
                    {selectedAppointment.consultation_rooms?.name}
                  </p>
                </div>
              </div>

              {/* Professional */}
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-500">Profesional</span>
                <p className="font-medium text-gray-900 flex items-center gap-2 mt-1">
                  <Stethoscope className="h-4 w-4" />
                  {selectedAppointment.professionals?.full_name}
                </p>
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