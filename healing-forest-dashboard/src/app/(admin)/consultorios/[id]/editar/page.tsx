"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  User,
  AlertCircle,
  Save,
  Stethoscope,
  CheckCircle,
  DollarSign,
  Timer,
  Trash2,
  Building
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"

interface Service {
  id: string
  name: string
  description: string
  base_price: number
  duration_minutes: number
  requires_professional: boolean
}

interface SubService {
  id: string
  service_id: string
  name: string
  description: string
  price: string
  duration_minutes: number
}

interface ConsultationRoom {
  id: string
  room_number: number
  name: string
}

interface Professional {
  id: string
  full_name: string
  active: boolean
}

interface AppointmentData {
  id: string
  user_id: string
  service_id: string
  sub_service_id: string | null
  professional_id: string
  appointment_date: string
  appointment_time: string
  end_time: string
  duration_minutes: number
  consultation_room_id: string
  notes: string
  status: string
  total_amount: number
  profiles?: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    phone: string | null
  }
  services?: {
    id: string
    name: string
    duration_minutes: number
    base_price: number
  }
  sub_services?: {
    id: string
    name: string
    duration_minutes: number
    price: string
  }
  professionals?: {
    id: string
    full_name: string
  }
  consultation_rooms?: {
    id: string
    room_number: number
    name: string
  }
}

export default function EditarCitaConsultoriosPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityMessage, setAvailabilityMessage] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [subServices, setSubServices] = useState<SubService[]>([])
  const [availableRooms, setAvailableRooms] = useState<ConsultationRoom[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    sub_service_id: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    appointment_time: '08:00',
    room_id: '',
    professional_id: '',
    notes: '',
    status: 'confirmed'
  })
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Generar opciones de tiempo cada 15 minutos
  const TIME_OPTIONS = []
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      TIME_OPTIONS.push(time)
    }
  }

  useEffect(() => {
    fetchAppointmentData()
  }, [appointmentId])

  // Verificar disponibilidad cuando cambian fecha, hora o servicio (pero no al cargar inicial)
  useEffect(() => {
    if (!loading && formData.appointment_date && formData.appointment_time && formData.service_id && formData.professional_id) {
      checkAvailability()
    }
  }, [formData.appointment_date, formData.appointment_time, formData.service_id, formData.sub_service_id, formData.professional_id])

  const fetchAppointmentData = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Obtener datos de la cita
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()

      if (appointmentError) throw appointmentError
      if (!appointmentData) {
        setError('Cita no encontrada')
        return
      }

      // Obtener datos relacionados
      const [profileData, serviceData, subServiceData, professionalData, roomData] = await Promise.all([
        // Profile
        supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, phone')
          .eq('id', appointmentData.user_id)
          .single(),
        
        // Service
        supabase
          .from('services')
          .select('id, name, duration_minutes, base_price')
          .eq('id', appointmentData.service_id)
          .single(),
        
        // Sub-service (si existe)
        appointmentData.sub_service_id ? 
          supabase
            .from('sub_services')
            .select('id, name, duration_minutes, price')
            .eq('id', appointmentData.sub_service_id)
            .single() 
          : Promise.resolve({ data: null }),
        
        // Professional
        supabase
          .from('professionals')
          .select('id, full_name')
          .eq('id', appointmentData.professional_id)
          .single(),
        
        // Room
        supabase
          .from('consultation_rooms')
          .select('id, room_number, name')
          .eq('id', appointmentData.consultation_room_id)
          .single()
      ])

      const fullAppointment: AppointmentData = {
        ...appointmentData,
        profiles: profileData.data || undefined,
        services: serviceData.data || undefined,
        sub_services: subServiceData.data || undefined,
        professionals: professionalData.data || undefined,
        consultation_rooms: roomData.data || undefined
      }

      setAppointment(fullAppointment)

      // Inicializar form data
      setFormData({
        client_id: appointmentData.user_id,
        service_id: appointmentData.service_id,
        sub_service_id: appointmentData.sub_service_id || '',
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time.slice(0, 5),
        room_id: appointmentData.consultation_room_id,
        professional_id: appointmentData.professional_id,
        notes: appointmentData.notes || '',
        status: appointmentData.status
      })

      setSelectedDate(new Date(appointmentData.appointment_date + 'T00:00:00'))

      // Obtener servicios de medicina
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .in('name', ['Medicina Funcional', 'Medicina Estética'])
        .eq('active', true)
        .order('name')
      
      setServices(servicesData || [])

      // Obtener sub-servicios si existen
      if (servicesData && servicesData.length > 0) {
        const serviceIds = servicesData.map(s => s.id)
        const { data: subServicesData } = await supabase
          .from('sub_services')
          .select('*')
          .in('service_id', serviceIds)
          .eq('active', true)
          .order('name')
        
        setSubServices(subServicesData || [])
      }
      
      // Obtener profesionales
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('*')
        .eq('active', true)
        .order('full_name')
      
      setProfessionals(professionalsData || [])
      
      // Obtener lista de clientes
      const { data: clientsData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, phone, email')
        .order('first_name')
      
      setClients(clientsData || [])
    } catch (error) {
      console.error('Error fetching appointment data:', error)
      setError('Error al cargar los datos de la cita')
    } finally {
      setLoading(false)
    }
  }

  const checkAvailability = async () => {
    setCheckingAvailability(true)
    setAvailabilityMessage('')
    setAvailableRooms([])
    
    const selectedService = services.find(s => s.id === formData.service_id)
    const selectedSubService = subServices.find(s => s.id === formData.sub_service_id)
    if (!selectedService) return
    
    const supabase = getSupabaseBrowser()
    const startTime = `${formData.appointment_time}:00`
    const durationMinutes = selectedSubService?.duration_minutes || selectedService.duration_minutes || 60
    const endTime = calculateEndTime(formData.appointment_time, durationMinutes)
    
    // Verificar que no pase de las 7 PM
    const [endHours] = endTime.split(':').map(Number)
    if (endHours >= 19 || (endHours === 18 && endTime > '19:00:00')) {
      setAvailabilityMessage('⚠️ La consulta terminaría después de las 7:00 PM. Por favor selecciona un horario más temprano.')
      setCheckingAvailability(false)
      return
    }
    
    try {
      // Verificar disponibilidad del profesional (excluyendo la cita actual)
      const { data: professionalAppointments, error: profError } = await supabase
        .from('appointments')
        .select('id')
        .eq('professional_id', formData.professional_id)
        .eq('appointment_date', formData.appointment_date)
        .neq('id', appointmentId)
        .in('status', ['confirmed', 'in_progress'])
        .gt('end_time', startTime)
        .lt('appointment_time', endTime)

      if (profError) throw profError

      if (professionalAppointments && professionalAppointments.length > 0) {
        setAvailabilityMessage('⚠️ El profesional no está disponible en este horario')
        setCheckingAvailability(false)
        return
      }

      // Llamar a la función de disponibilidad (excluyendo la cita actual)
      const { data: availability, error } = await supabase
        .rpc('check_consultation_room_availability', {
          p_date: formData.appointment_date,
          p_start_time: startTime,
          p_end_time: endTime,
          p_exclude_appointment_id: appointmentId
        })
      
      if (error) throw error
      
      const available = availability?.filter((room: any) => room.is_available) || []
      setAvailableRooms(available)
      
      if (available.length === 0) {
        setAvailabilityMessage('⚠️ No hay consultorios disponibles en este horario')
      } else {
        setAvailabilityMessage(`✅ ${available.length} consultorio${available.length > 1 ? 's' : ''} disponible${available.length > 1 ? 's' : ''}`)
        
        // Si el consultorio actual no está disponible, deseleccionarlo
        if (formData.room_id) {
          const currentRoomAvailable = available.find((r: any) => r.room_id === formData.room_id)
          if (!currentRoomAvailable) {
            setFormData(prev => ({ ...prev, room_id: '' }))
            setAvailabilityMessage(prev => prev + ' (El consultorio actual ya no está disponible)')
          }
        }
      }
    } catch (error) {
      console.error('Error checking availability:', error)
      setAvailabilityMessage('Error al verificar disponibilidad')
    } finally {
      setCheckingAvailability(false)
    }
  }

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    // Validaciones
    if (!formData.client_id) {
      setError('Por favor selecciona un paciente')
      setSaving(false)
      return
    }

    if (!formData.service_id) {
      setError('Por favor selecciona un servicio')
      setSaving(false)
      return
    }

    if (!formData.professional_id) {
      setError('Por favor selecciona un profesional')
      setSaving(false)
      return
    }

    if (availableRooms.length === 0 && formData.room_id !== appointment?.consultation_room_id) {
      setError('No hay consultorios disponibles en el horario seleccionado')
      setSaving(false)
      return
    }

    if (!formData.room_id && availableRooms.length > 0) {
      // Auto-seleccionar el primer consultorio disponible
      formData.room_id = availableRooms[0].room_id
    }

    const supabase = getSupabaseBrowser()

    try {
      const selectedService = services.find(s => s.id === formData.service_id)
      const selectedSubService = subServices.find(s => s.id === formData.sub_service_id)
      if (!selectedService) throw new Error('Servicio no encontrado')

      const startTime = `${formData.appointment_time}:00`
      const durationMinutes = selectedSubService?.duration_minutes || selectedService.duration_minutes || 60
      const endTime = calculateEndTime(formData.appointment_time, durationMinutes)

      const updateData = {
        user_id: formData.client_id,
        service_id: formData.service_id,
        sub_service_id: formData.sub_service_id || null,
        professional_id: formData.professional_id,
        appointment_date: formData.appointment_date,
        appointment_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        status: formData.status,
        consultation_room_id: formData.room_id,
        notes: formData.notes,
        total_amount: selectedSubService ? parseFloat(selectedSubService.price) : selectedService.base_price,
        updated_at: new Date().toISOString()
      }
      
      const { error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.push('/consultorios')
      }, 1500)
    } catch (error) {
      console.error('Error updating appointment:', error)
      setError('Error al actualizar la cita. Por favor intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de cancelar esta cita?\n\nEsta acción no se puede deshacer.')) return

    const supabase = getSupabaseBrowser()
    
    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelado por administrador'
        })
        .eq('id', appointmentId)

      if (error) throw error

      router.push('/consultorios')
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Error al cancelar la cita. Por favor intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const getClientName = (client: any) => {
    if (client.first_name && client.last_name) {
      return `${client.first_name} ${client.last_name}`
    }
    return client.full_name || client.email || 'Sin nombre'
  }

  const getSubServicesForService = (serviceId: string) => {
    return subServices.filter(sub => sub.service_id === serviceId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando datos de la cita...</div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Cita no encontrada</h2>
        <Link
          href="/consultorios"
          className="text-hf-primary hover:underline"
        >
          Volver a consultorios
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/consultorios"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Editar Cita de Consultorio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Modifica los detalles de la consulta médica
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">¡Cita actualizada exitosamente! Redirigiendo...</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                Paciente *
              </div>
            </label>
            <select
              name="client_id"
              value={formData.client_id}
              onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
              required
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
            >
              <option value="">Selecciona un paciente</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {getClientName(client)} {client.phone ? `- ${client.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Servicio y Sub-servicio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-gray-400" />
                  Tipo de Medicina *
                </div>
              </label>
              <select
                name="service_id"
                value={formData.service_id}
                onChange={(e) => {
                  const serviceId = e.target.value
                  setFormData(prev => ({ 
                    ...prev, 
                    service_id: serviceId,
                    sub_service_id: '' // Reset sub-service when service changes
                  }))
                }}
                required
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
              >
                <option value="">Selecciona el tipo</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.service_id && getSubServicesForService(formData.service_id).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-gray-400" />
                    Tratamiento específico *
                  </div>
                </label>
                <select
                  name="sub_service_id"
                  value={formData.sub_service_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, sub_service_id: e.target.value }))}
                  required
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
                >
                  <option value="">Selecciona el tratamiento</option>
                  {getSubServicesForService(formData.service_id).map(subService => (
                    <option key={subService.id} value={subService.id}>
                      {subService.name} - {subService.duration_minutes} min - ${parseInt(subService.price).toLocaleString('es-CO')}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Profesional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-gray-400" />
                Profesional *
              </div>
            </label>
            <select
              name="professional_id"
              value={formData.professional_id}
              onChange={(e) => setFormData(prev => ({ ...prev, professional_id: e.target.value }))}
              required
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
            >
              <option value="">Selecciona un profesional</option>
              {professionals.map(professional => (
                <option key={professional.id} value={professional.id}>
                  {professional.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Message */}
          {availabilityMessage && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              availabilityMessage.includes('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {checkingAvailability ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Verificando disponibilidad...
                </div>
              ) : (
                availabilityMessage
              )}
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Fecha *
                </div>
              </label>
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => {
                  if (date) {
                    setSelectedDate(date)
                    setFormData(prev => ({
                      ...prev,
                      appointment_date: format(date, 'yyyy-MM-dd')
                    }))
                  }
                }}
                minDate={new Date()}
                dateFormat="dd/MM/yyyy"
                locale={es}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
                placeholderText="Selecciona una fecha"
                required
                popperPlacement="bottom-start"
                showPopperArrow={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Hora de inicio *
                </div>
              </label>
              <select
                name="appointment_time"
                value={formData.appointment_time}
                onChange={(e) => setFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
                required
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Consultorio y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  Consultorio *
                </div>
              </label>
              <select
                name="room_id"
                value={formData.room_id}
                onChange={(e) => setFormData(prev => ({ ...prev, room_id: e.target.value }))}
                required
                disabled={availableRooms.length === 0 || saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
              >
                <option value="">Selecciona un consultorio</option>
                {/* Mostrar consultorio actual aunque no esté disponible */}
                {appointment.consultation_rooms && formData.room_id === appointment.consultation_room_id && (
                  <option value={appointment.consultation_room_id}>
                    {appointment.consultation_rooms.name} (Actual)
                  </option>
                )}
                {/* Mostrar consultorios disponibles */}
                {availableRooms.map(room => (
                  <option key={room.room_id} value={room.room_id}>
                    {room.room_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  Estado
                </div>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
              >
                <option value="confirmed">Confirmada</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas adicionales
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
              placeholder="Alguna información adicional sobre la consulta..."
            />
          </div>

          {/* Summary */}
          {formData.service_id && formData.professional_id && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-gray-900 mb-3">Resumen de la Cita</h3>
              {(() => {
                const selectedService = services.find(s => s.id === formData.service_id)
                const selectedSubService = subServices.find(s => s.id === formData.sub_service_id)
                const selectedClient = clients.find(c => c.id === formData.client_id)
                const selectedProfessional = professionals.find(p => p.id === formData.professional_id)
                const durationMinutes = selectedSubService?.duration_minutes || selectedService?.duration_minutes || 60
                const endTime = calculateEndTime(formData.appointment_time, durationMinutes)
                
                return (
                  <>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-gray-500">Servicio:</span>
                      <span className="font-medium">
                        {selectedService?.name || 'Por definir'}
                        {selectedSubService && ` - ${selectedSubService.name}`}
                      </span>
                      
                      <span className="text-gray-500">Paciente:</span>
                      <span className="font-medium">{selectedClient ? getClientName(selectedClient) : 'Por definir'}</span>
                      
                      <span className="text-gray-500">Profesional:</span>
                      <span className="font-medium">{selectedProfessional?.full_name || 'Por definir'}</span>
                      
                      <span className="text-gray-500">Fecha:</span>
                      <span className="font-medium">
                        {format(new Date(formData.appointment_date + 'T00:00:00'), 'EEEE d \'de\' MMMM, yyyy', { locale: es })}
                      </span>
                      
                      <span className="text-gray-500">Horario:</span>
                      <span className="font-medium">
                        {formData.appointment_time} - {endTime.slice(0, 5)}
                      </span>
                      
                      <span className="text-gray-500">Duración:</span>
                      <span className="font-medium">{durationMinutes} minutos</span>
                    </div>
                    
                    {(selectedService || selectedSubService) && (
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Total a pagar:</span>
                          <span className="text-xl font-bold text-gray-900">
                            ${(selectedSubService ? parseInt(selectedSubService.price) : selectedService?.base_price || 0).toLocaleString('es-CO')} COP
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-5 w-5" />
            Cancelar Cita
          </button>
          
          <div className="flex gap-3">
            <Link
              href="/consultorios"
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Volver
            </Link>
            <button
              type="submit"
              disabled={saving || success || (availableRooms.length === 0 && formData.room_id !== appointment?.consultation_room_id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
                saving || success || (availableRooms.length === 0 && formData.room_id !== appointment?.consultation_room_id)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
              }`}
            >
              {saving ? (
                <>
                  <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}