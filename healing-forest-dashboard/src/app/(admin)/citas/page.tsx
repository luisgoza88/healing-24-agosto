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
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, addMinutes, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface Professional {
  id: string
  full_name: string
}

interface Service {
  id: string
  name: string
  duration_minutes: number
  color: string
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  user_id: string
  service_id: string
  professional_id: string
  notes?: string
  profiles: {
    full_name: string | null
    first_name: string | null
    last_name: string | null
  }
  services: Service
  professionals: Professional
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
]

export default function AppointmentsPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
    fetchData()
  }, [currentWeek])

  const fetchData = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Fetch professionals
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('id, full_name')
        .eq('active', true)
        .order('full_name')

      setProfessionals(professionalsData || [])

      // Fetch appointments for the week with fixed foreign key syntax
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:profiles!appointments_user_id_fkey(full_name, first_name, last_name),
          services:services!appointments_service_id_fkey(*),
          professionals:professionals!appointments_professional_id_fkey(*)
        `)
        .gte('appointment_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('appointment_date')
        .order('appointment_time')

      setAppointments(appointmentsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPatientName = (appointment: Appointment) => {
    const profile = appointment.profiles
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    return profile?.full_name || 'Sin nombre'
  }

  const getAppointmentPosition = (time: string, duration: number) => {
    const [hours, minutes] = time.split(':').map(Number)
    const slotIndex = TIME_SLOTS.findIndex(slot => {
      const [slotHours, slotMinutes] = slot.split(':').map(Number)
      return hours === slotHours && minutes >= slotMinutes && minutes < slotMinutes + 30
    })

    const minutesFromSlotStart = minutes % 30
    const topOffset = (minutesFromSlotStart / 30) * 100
    const height = (duration / 30) * 100

    return {
      top: `${topOffset}%`,
      height: `${height}%`
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 border-green-300'
      case 'completed':
        return 'bg-blue-100 border-blue-300'
      case 'cancelled':
        return 'bg-red-100 border-red-300'
      case 'pending':
        return 'bg-yellow-100 border-yellow-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  const filteredAppointments = appointments.filter(appointment => {
    const matchesProfessional = selectedProfessional === 'all' || appointment.professional_id === selectedProfessional
    const matchesSearch = searchTerm === '' || 
      getPatientName(appointment).toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.services.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesProfessional && matchesSearch
  })

  const getAppointmentsForSlot = (day: Date, timeSlot: string) => {
    return filteredAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date)
      if (!isSameDay(appointmentDate, day)) return false
      
      const appointmentTime = appointment.appointment_time.slice(0, 5)
      const [aptHours, aptMinutes] = appointmentTime.split(':').map(Number)
      const [slotHours, slotMinutes] = timeSlot.split(':').map(Number)
      
      // Check if appointment starts in this 30-minute slot
      const aptTotalMinutes = aptHours * 60 + aptMinutes
      const slotStartMinutes = slotHours * 60 + slotMinutes
      const slotEndMinutes = slotStartMinutes + 30
      
      return aptTotalMinutes >= slotStartMinutes && aptTotalMinutes < slotEndMinutes
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando calendario...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendario de Citas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las citas de todos los profesionales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/citas/nueva"
            className="flex items-center gap-2 px-4 py-2 text-white bg-hf-primary rounded-lg hover:bg-hf-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
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
                placeholder="Buscar paciente o servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            </div>

            {/* Professional Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={selectedProfessional}
                onChange={(e) => setSelectedProfessional(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              >
                <option value="all">Todos los profesionales</option>
                {professionals.map(prof => (
                  <option key={prof.id} value={prof.id}>
                    {prof.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Days Header */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-3 text-sm font-medium text-gray-700 border-r border-gray-200">
              Hora
            </div>
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`p-3 text-center border-r border-gray-200 ${
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
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-8">
              <div className="border-r border-gray-200">
                {TIME_SLOTS.map(time => (
                  <div
                    key={time}
                    className="h-16 px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100"
                  >
                    {time}
                  </div>
                ))}
              </div>
              
              {weekDays.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`border-r border-gray-200 ${
                    isSameDay(day, new Date()) ? 'bg-hf-primary/5' : ''
                  }`}
                >
                  {TIME_SLOTS.map(timeSlot => (
                    <div
                      key={`${dayIndex}-${timeSlot}`}
                      className="h-16 border-b border-gray-100 relative"
                    >
                      {getAppointmentsForSlot(day, timeSlot).map(appointment => {
                        const position = getAppointmentPosition(
                          appointment.appointment_time,
                          appointment.services.duration_minutes
                        )
                        
                        return (
                          <div
                            key={appointment.id}
                            className={`absolute inset-x-1 rounded p-1 text-xs border ${getStatusColor(appointment.status)} 
                              cursor-pointer hover:shadow-md transition-shadow overflow-hidden`}
                            style={{
                              top: position.top,
                              height: position.height,
                              backgroundColor: appointment.services.color ? `${appointment.services.color}20` : undefined
                            }}
                            title={`${getPatientName(appointment)} - ${appointment.services.name}`}
                          >
                            <div className="font-semibold truncate">
                              {appointment.appointment_time.slice(0, 5)} - {getPatientName(appointment)}
                            </div>
                            <div className="text-gray-600 truncate">
                              {appointment.services.name}
                            </div>
                            {appointment.professionals && (
                              <div className="text-gray-500 truncate">
                                {appointment.professionals.full_name}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Estados de las citas</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-sm text-gray-600">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-sm text-gray-600">Confirmada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-sm text-gray-600">Completada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-sm text-gray-600">Cancelada</span>
          </div>
        </div>
      </div>
    </div>
  )
}