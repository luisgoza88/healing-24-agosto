'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface Appointment {
  id: string
  service_name: string
  professional_name: string
  appointment_date: string
  appointment_time: string
  location?: string
  status: string
}

interface ClassEnrollment {
  id: string
  class: {
    id: string
    name: string
    instructor_name: string
    date: string
    start_time: string
    end_time: string
    location: string
    class_type: string
  }
  payment_status: string
}

type CalendarEvent = {
  id: string
  type: 'appointment' | 'class'
  title: string
  subtitle: string
  date: string
  time: string
  location: string
  status: string
  link: string
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'list'>('month')

  const supabase = createClient()

  useEffect(() => {
    fetchEvents()
  }, [currentDate])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      // Fetch appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          service:services(name),
          professional:professionals(full_name)
        `)
        .eq('user_id', user.id)
        .gte('appointment_date', monthStart.toISOString().split('T')[0])
        .lte('appointment_date', monthEnd.toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      // Fetch class enrollments
      const { data: enrollments } = await supabase
        .from('breathe_move_enrollments')
        .select(`
          id,
          payment_status,
          class:breathe_move_classes(
            id,
            name,
            instructor_name,
            date,
            start_time,
            end_time,
            location,
            class_type
          )
        `)
        .eq('user_id', user.id)
        .gte('class.date', monthStart.toISOString().split('T')[0])
        .lte('class.date', monthEnd.toISOString().split('T')[0])

      // Convert to calendar events
      const calendarEvents: CalendarEvent[] = []

      // Add appointments
      appointments?.forEach(apt => {
        calendarEvents.push({
          id: apt.id,
          type: 'appointment',
          title: apt.service?.name || 'Cita médica',
          subtitle: `Dr. ${apt.professional?.full_name}`,
          date: apt.appointment_date,
          time: apt.appointment_time,
          location: 'Consultorio médico',
          status: apt.status,
          link: `/appointments/${apt.id}`,
        })
      })

      // Add classes
      enrollments?.forEach(enrollment => {
        if (enrollment.class) {
          calendarEvents.push({
            id: enrollment.id,
            type: 'class',
            title: enrollment.class.name,
            subtitle: enrollment.class.instructor_name,
            date: enrollment.class.date,
            time: enrollment.class.start_time,
            location: enrollment.class.location,
            status: enrollment.payment_status,
            link: `/classes/${enrollment.class.id}`,
          })
        }
      })

      setEvents(calendarEvents)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter(event => event.date === dateStr)
  }

  const getEventTypeColor = (type: string) => {
    return type === 'appointment' ? 'bg-blue-500' : 'bg-green-500'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mi Calendario</h1>
              <p className="mt-2 text-lg text-gray-600">
                Gestiona tus citas y clases en un solo lugar
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  view === 'month'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  view === 'list'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Lista
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Cargando calendario...</p>
            </div>
          </div>
        ) : view === 'month' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm">
                {/* Calendar Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <button
                    onClick={handlePreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                  </h2>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="p-4">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth().map(day => {
                      const dayEvents = getEventsForDate(day)
                      const isSelected = selectedDate && isSameDay(day, selectedDate)
                      const isToday = isSameDay(day, new Date())

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={`
                            min-h-[80px] p-2 rounded-lg border text-left transition-colors
                            ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}
                            ${isToday ? 'bg-blue-50' : ''}
                          `}
                        >
                          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                            {format(day, 'd')}
                          </div>
                          {dayEvents.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {dayEvents.slice(0, 2).map((event, idx) => (
                                <div
                                  key={idx}
                                  className={`h-1.5 rounded-full ${getEventTypeColor(event.type)}`}
                                />
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{dayEvents.length - 2}
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Date Events */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedDate
                    ? format(selectedDate, "d 'de' MMMM", { locale: es })
                    : 'Selecciona una fecha'}
                </h3>

                {selectedDate && selectedDateEvents.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No tienes eventos para esta fecha
                  </p>
                )}

                {selectedDateEvents.length > 0 && (
                  <div className="space-y-3">
                    {selectedDateEvents.map(event => (
                      <Link
                        key={event.id}
                        href={event.link}
                        className="block p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{event.title}</h4>
                            <p className="text-sm text-gray-600">{event.subtitle}</p>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="mr-1 h-3 w-3" />
                                {event.time.slice(0, 5)}
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <MapPin className="mr-1 h-3 w-3" />
                                {event.location}
                              </div>
                            </div>
                          </div>
                          <div className={`h-2 w-2 rounded-full ${getEventTypeColor(event.type)}`} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Leyenda</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <div className="h-3 w-3 rounded-full bg-blue-500 mr-2" />
                    <span className="text-gray-600">Citas médicas</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="h-3 w-3 rounded-full bg-green-500 mr-2" />
                    <span className="text-gray-600">Clases</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Próximos eventos
              </h2>
              <div className="space-y-4">
                {events.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No tienes eventos programados este mes
                  </p>
                ) : (
                  events.map(event => (
                    <Link
                      key={event.id}
                      href={event.link}
                      className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{event.title}</h3>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(event.status)}`}>
                              {event.status === 'confirmed' && 'Confirmado'}
                              {event.status === 'pending' && 'Pendiente'}
                              {event.status === 'paid' && 'Pagado'}
                              {event.status === 'cancelled' && 'Cancelado'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{event.subtitle}</p>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <CalendarIcon className="mr-1 h-4 w-4" />
                              {format(parseISO(event.date), "d 'de' MMMM", { locale: es })}
                            </div>
                            <div className="flex items-center">
                              <Clock className="mr-1 h-4 w-4" />
                              {event.time.slice(0, 5)}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="mr-1 h-4 w-4" />
                              {event.location}
                            </div>
                          </div>
                        </div>
                        <div className={`h-3 w-3 rounded-full ${getEventTypeColor(event.type)}`} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}