"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { 
  Calendar,
  Clock,
  Users,
  Activity,
  CalendarDays,
  TrendingUp,
  Stethoscope,
  ChevronRight,
  User,
  Building
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import ConsultorioDetail from './ConsultorioDetail'

interface ConsultationRoom {
  id: string
  room_number: number
  name: string
  status: string
}

interface TodayAppointment {
  id: string
  appointment_time: string
  end_time: string
  consultation_room_id: string
  profiles: {
    full_name: string | null
    first_name: string | null
    last_name: string | null
  }
  professionals: {
    full_name: string
  }
  services: {
    name: string
  }
}

export default function ConsultoriosPage() {
  const [rooms, setRooms] = useState<ConsultationRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ConsultationRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  
  // Estadísticas globales
  const [totalTodaySessions, setTotalTodaySessions] = useState(0)
  const [totalWeekSessions, setTotalWeekSessions] = useState(0)
  const [totalMonthlyIncome, setTotalMonthlyIncome] = useState(0)
  
  // Estadísticas por consultorio
  const [roomStats, setRoomStats] = useState<Record<string, { today: number, week: number, month: number }>>({})

  useEffect(() => {
    fetchRooms()
    fetchGlobalStatistics()
    fetchTodayAppointments()
  }, [])

  const fetchRooms = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      const { data } = await supabase
        .from('consultation_rooms')
        .select('*')
        .eq('status', 'available')
        .order('room_number')
      
      console.log('Rooms data:', data)
      
      if (data) {
        setRooms(data)
        // Fetch stats for each room
        for (const room of data) {
          await fetchRoomStatistics(room.id)
        }
      } else {
        console.log('No rooms found')
        setRooms([])
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGlobalStatistics = async () => {
    const supabase = getSupabaseBrowser()
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)

    try {
      // Sesiones de hoy - todos los consultorios
      const { data: todayData } = await supabase
        .from('appointments')
        .select('id')
        .not('consultation_room_id', 'is', null)
        .eq('appointment_date', format(today, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')

      setTotalTodaySessions(todayData?.length || 0)

      // Sesiones de la semana
      const { data: weekData } = await supabase
        .from('appointments')
        .select('id')
        .not('consultation_room_id', 'is', null)
        .gte('appointment_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(weekEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')

      setTotalWeekSessions(weekData?.length || 0)

      // Ingresos del mes
      const { data: monthData } = await supabase
        .from('appointments')
        .select('id, service_id')
        .not('consultation_room_id', 'is', null)
        .gte('appointment_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed')

      // Si hay citas, obtener los precios de los servicios
      let totalIncome = 0
      if (monthData && monthData.length > 0) {
        const serviceIds = [...new Set(monthData.map(apt => apt.service_id))]
        const { data: services } = await supabase
          .from('services')
          .select('id, base_price')
          .in('id', serviceIds)
        
        const servicesMap = new Map(services?.map(s => [s.id, s.base_price]) || [])
        totalIncome = monthData.reduce((sum, appointment) => {
          return sum + (servicesMap.get(appointment.service_id) || 0)
        }, 0)
      }

      setTotalMonthlyIncome(totalIncome)
    } catch (error) {
      console.error('Error fetching global statistics:', error)
    }
  }

  const fetchRoomStatistics = async (roomId: string) => {
    const supabase = getSupabaseBrowser()
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

    try {
      // Sesiones de hoy para este consultorio
      const { data: todayData } = await supabase
        .from('appointments')
        .select('id')
        .eq('consultation_room_id', roomId)
        .eq('appointment_date', format(today, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')

      // Sesiones de la semana
      const { data: weekData } = await supabase
        .from('appointments')
        .select('id')
        .eq('consultation_room_id', roomId)
        .gte('appointment_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(weekEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')

      setRoomStats(prev => ({
        ...prev,
        [roomId]: {
          today: todayData?.length || 0,
          week: weekData?.length || 0,
          month: 0 // Podemos calcular esto si es necesario
        }
      }))
    } catch (error) {
      console.error('Error fetching room statistics:', error)
    }
  }

  const fetchTodayAppointments = async () => {
    const supabase = getSupabaseBrowser()
    const today = format(new Date(), 'yyyy-MM-dd')

    try {
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .not('consultation_room_id', 'is', null)
        .eq('appointment_date', today)
        .neq('status', 'cancelled')
        .order('appointment_time', { ascending: true })

      if (appointmentsData && appointmentsData.length > 0) {
        // Cargar datos relacionados
        const userIds = [...new Set(appointmentsData.map(apt => apt.user_id))]
        const professionalIds = [...new Set(appointmentsData.map(apt => apt.professional_id))]
        const serviceIds = [...new Set(appointmentsData.map(apt => apt.service_id))]

        // Cargar perfiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name')
          .in('id', userIds)

        // Cargar profesionales
        const { data: professionals } = await supabase
          .from('professionals')
          .select('id, full_name')
          .in('id', professionalIds)

        // Cargar servicios
        const { data: services } = await supabase
          .from('services')
          .select('id, name')
          .in('id', serviceIds)

        // Mapear los datos
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])
        const professionalsMap = new Map(professionals?.map(p => [p.id, p]) || [])
        const servicesMap = new Map(services?.map(s => [s.id, s]) || [])

        const enrichedData = appointmentsData.map(apt => ({
          ...apt,
          profiles: profilesMap.get(apt.user_id),
          professionals: professionalsMap.get(apt.professional_id),
          services: servicesMap.get(apt.service_id)
        }))

        setTodayAppointments(enrichedData || [])
      } else {
        setTodayAppointments([])
      }
    } catch (error) {
      console.error('Error fetching today appointments:', error)
    }
  }

  if (selectedRoom) {
    return (
      <ConsultorioDetail 
        room={selectedRoom} 
        onBack={() => setSelectedRoom(null)} 
      />
    )
  }

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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Consultorios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestión de citas médicas y consultas
        </p>
      </div>

      {/* Estadísticas globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Consultas Hoy (Total)</p>
              <p className="text-2xl font-bold text-gray-900">{totalTodaySessions}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Consultas Semana</p>
              <p className="text-2xl font-bold text-gray-900">{totalWeekSessions}</p>
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
                ${totalMonthlyIncome.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de consultorios */}
      {rooms.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay consultorios configurados</h3>
          <p className="text-gray-500 mb-4">
            Parece que no hay consultorios activos en el sistema. 
            Por favor, contacta al administrador para configurar los consultorios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => setSelectedRoom(room)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <Building className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                      <p className="text-sm text-gray-500">Consultorio {room.room_number}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Citas hoy</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {roomStats[room.id]?.today || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Citas semana</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {roomStats[room.id]?.week || 0}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Haz clic para ver el calendario completo
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumen de citas del día */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Citas de Hoy - {format(new Date(), "d 'de' MMMM", { locale: es })}
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {todayAppointments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay citas programadas para hoy
            </div>
          ) : (
            todayAppointments.map((appointment) => {
              const room = rooms.find(r => r.id === appointment.consultation_room_id)
              const clientName = appointment.profiles?.first_name && appointment.profiles?.last_name
                ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
                : appointment.profiles?.full_name || 'Sin nombre'
              
              return (
                <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {appointment.appointment_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                          {room?.name}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{clientName}</p>
                        <p className="text-xs text-gray-500">
                          {appointment.services.name} - {appointment.professionals.full_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}