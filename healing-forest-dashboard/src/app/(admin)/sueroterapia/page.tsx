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
  Droplet,
  User
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, addMinutes, parse, isAfter, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface DripsAppointment {
  id: string
  user_id: string
  service_id: string
  sub_service_id: string
  appointment_date: string
  appointment_time: string
  end_time: string
  duration_minutes: number
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  drips_station_id: string
  profiles: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    phone: string | null
  }
  sub_services: {
    name: string
    duration_minutes: number
    price: string
  }
  drips_stations: {
    id: string
    station_number: number
    name: string
  }
}

interface DripsStation {
  id: string
  station_number: number
  name: string
  status: string
}

export default function SueroterapiaPage() {
  const [appointments, setAppointments] = useState<DripsAppointment[]>([])
  const [stations, setStations] = useState<DripsStation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<DripsAppointment | null>(null)
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
      // Obtener estaciones
      const { data: stationsData, error: stationsError } = await supabase
        .from('drips_stations')
        .select('*')
        .order('station_number')

      if (stationsError) throw stationsError
      setStations(stationsData || [])

      // Obtener citas de la semana - primero las citas
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('service_id', 'c4a5e8f2-9b3d-4e1a-8f7c-2d9a3b4c5e6f') // ID del servicio DRIPS
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
        const subServiceIds = [...new Set(appointmentsData.map(apt => apt.sub_service_id))].filter(Boolean)
        const stationIds = [...new Set(appointmentsData.map(apt => apt.drips_station_id))].filter(Boolean)

        // Obtener profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, phone')
          .in('id', userIds)

        // Obtener sub_services
        const { data: subServicesData } = await supabase
          .from('sub_services')
          .select('id, name, duration_minutes, price')
          .in('id', subServiceIds)

        // Obtener drips_stations
        const { data: dripsStationsData } = await supabase
          .from('drips_stations')
          .select('id, station_number, name')
          .in('id', stationIds)

        // Crear mapas para acceso rápido
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
        const subServicesMap = new Map(subServicesData?.map(s => [s.id, s]) || [])
        const stationsMap = new Map(dripsStationsData?.map(s => [s.id, s]) || [])

        // Combinar los datos
        const appointmentsWithRelations = appointmentsData.map(apt => ({
          ...apt,
          profiles: profilesMap.get(apt.user_id) || null,
          sub_services: subServicesMap.get(apt.sub_service_id) || null,
          drips_stations: stationsMap.get(apt.drips_station_id) || null
        }))

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

  const getAppointmentsForDayAndTime = (day: Date, timeSlot: string) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date + 'T00:00:00')
      if (!isSameDay(aptDate, day)) return false
      
      const slotTime = parse(timeSlot, 'HH:mm', new Date())
      const aptStart = parse(apt.appointment_time.slice(0, 5), 'HH:mm', new Date())
      const aptEnd = parse(apt.end_time.slice(0, 5), 'HH:mm', new Date())
      
      return (isAfter(slotTime, aptStart) || format(slotTime, 'HH:mm') === format(aptStart, 'HH:mm')) && 
             isBefore(slotTime, aptEnd)
    })
  }

  const getOccupiedStations = (day: Date, timeSlot: string) => {
    const appointments = getAppointmentsForDayAndTime(day, timeSlot)
    return appointments.map(apt => apt.drips_stations?.station_number || 0)
  }

  const getAvailableStations = (day: Date, timeSlot: string) => {
    const occupied = getOccupiedStations(day, timeSlot)
    return 5 - occupied.length
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

  const getServiceColor = (subServiceName: string) => {
    if (subServiceName?.includes('NAD')) {
      if (subServiceName.includes('1000')) return 'bg-purple-100 text-purple-700 border-purple-200'
      if (subServiceName.includes('500')) return 'bg-indigo-100 text-indigo-700 border-indigo-200'
      if (subServiceName.includes('125')) return 'bg-blue-100 text-blue-700 border-blue-200'
    }
    if (subServiceName?.includes('Vitamina')) return 'bg-green-100 text-green-700 border-green-200'
    if (subServiceName?.includes('Ozono')) return 'bg-cyan-100 text-cyan-700 border-cyan-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const filteredAppointments = appointments.filter(apt => {
    const clientName = `${apt.profiles?.first_name || ''} ${apt.profiles?.last_name || apt.profiles?.full_name || ''}`.toLowerCase()
    const serviceName = apt.sub_services?.name?.toLowerCase() || ''
    
    const matchesSearch = searchTerm === '' || 
      clientName.includes(searchTerm.toLowerCase()) ||
      serviceName.includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || apt.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando sueroterapia...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sueroterapia</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de citas para IV Drips y terapias intravenosas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sueroterapia/nueva"
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
                placeholder="Buscar cliente o servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              >
                <option value="all">Todos los estados</option>
                <option value="confirmed">Confirmadas</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completadas</option>
              </select>
            </div>
          </div>

          {/* Station Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-600">Ocupado</span>
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
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeSlots.map((timeSlot, timeIndex) => (
                <tr key={timeIndex} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700 border-r border-gray-200">
                    {timeSlot}
                  </td>
                  {weekDays.map((day, dayIndex) => {
                    const appointments = getAppointmentsForDayAndTime(day, timeSlot)
                    const availableStations = getAvailableStations(day, timeSlot)
                    const isPast = isPastSlot(day, timeSlot)
                    
                    return (
                      <td
                        key={dayIndex}
                        className={`px-2 py-2 border-l border-gray-100 ${
                          isSameDay(day, new Date()) ? 'bg-hf-primary/5' : ''
                        } ${isPast ? 'bg-gray-50' : ''}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* Mostrar indicadores de estaciones */}
                          {[1, 2, 3, 4, 5].map(stationNum => {
                            const apt = appointments.find(a => a.drips_stations?.station_number === stationNum)
                            const isOccupied = !!apt
                            
                            return (
                              <div
                                key={stationNum}
                                className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-110 ${
                                  isOccupied 
                                    ? 'bg-red-500 text-white' 
                                    : isPast 
                                    ? 'bg-gray-300 text-gray-500'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                                title={
                                  isOccupied 
                                    ? `${apt.sub_services?.name} - ${apt.profiles?.first_name || apt.profiles?.full_name || 'Cliente'}`
                                    : `Espacio ${stationNum} disponible`
                                }
                                onClick={() => {
                                  if (isOccupied && apt) {
                                    setSelectedAppointment(apt)
                                    setShowDetails(true)
                                  } else if (!isPast) {
                                    // Redirigir a nueva cita con fecha y hora preseleccionada
                                    window.location.href = `/sueroterapia/nueva?date=${format(day, 'yyyy-MM-dd')}&time=${timeSlot}&station=${stationNum}`
                                  }
                                }}
                              >
                                {stationNum}
                              </div>
                            )
                          })}
                        </div>
                        {/* Contador de disponibilidad */}
                        <div className="text-xs text-center mt-1 text-gray-500">
                          {availableStations}/5
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
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
                    {selectedAppointment.sub_services?.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(selectedAppointment.appointment_date), 'dd \'de\' MMMM, yyyy', { locale: es })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/sueroterapia/${selectedAppointment.id}/editar`}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Link>
                  <button
                    onClick={() => {
                      handleDeleteAppointment(
                        selectedAppointment.id, 
                        selectedAppointment.sub_services?.name || 'Servicio'
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
                  Información del Cliente
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
                  <span className="text-sm text-gray-500">Estación</span>
                  <p className="font-medium text-gray-900">
                    {selectedAppointment.drips_stations?.name}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-500">Precio</span>
                <p className="font-medium text-gray-900 text-lg">
                  ${parseInt(selectedAppointment.sub_services?.price || '0').toLocaleString('es-CO')} COP
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