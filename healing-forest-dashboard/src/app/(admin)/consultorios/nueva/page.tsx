"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { useRouter, useSearchParams } from 'next/navigation'
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
  preferred_professional_id: string | null
}

interface Professional {
  id: string
  full_name: string
  active: boolean
}

export default function NuevaCitaConsultoriosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityMessage, setAvailabilityMessage] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [subServices, setSubServices] = useState<SubService[]>([])
  const [availableRooms, setAvailableRooms] = useState<ConsultationRoom[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [clients, setClients] = useState<any[]>([])

  // Form state - inicializar con parámetros de URL si existen
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    sub_service_id: '',
    appointment_date: searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'),
    appointment_time: searchParams.get('time') || '08:00',
    room_id: searchParams.get('room') || '',
    professional_id: '',
    notes: ''
  })
  const [selectedDate, setSelectedDate] = useState<Date>(
    searchParams.get('date') ? new Date(searchParams.get('date')! + 'T00:00:00') : new Date()
  )

  // Generar opciones de tiempo cada 15 minutos
  const TIME_OPTIONS = []
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      TIME_OPTIONS.push(time)
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  // Verificar disponibilidad cuando cambian fecha, hora o servicio
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.appointment_date || !formData.appointment_time || !formData.service_id || !formData.professional_id) return
      
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
        // Verificar disponibilidad del profesional
        const { data: professionalAppointments, error: profError } = await supabase
          .from('appointments')
          .select('id')
          .eq('professional_id', formData.professional_id)
          .eq('appointment_date', formData.appointment_date)
          .in('status', ['confirmed', 'in_progress'])
          .gt('end_time', startTime)
          .lt('appointment_time', endTime)

        if (profError) throw profError

        if (professionalAppointments && professionalAppointments.length > 0) {
          setAvailabilityMessage('⚠️ El profesional no está disponible en este horario')
          setCheckingAvailability(false)
          return
        }

        // Llamar a la función de disponibilidad de consultorios
        const { data: availability, error } = await supabase
          .rpc('check_consultation_room_availability', {
            p_date: formData.appointment_date,
            p_start_time: startTime,
            p_end_time: endTime
          })
        
        if (error) throw error
        
        const available = availability?.filter((room: any) => room.is_available) || []
        setAvailableRooms(available)
        
        if (available.length === 0) {
          setAvailabilityMessage('⚠️ No hay consultorios disponibles en este horario')
        } else {
          setAvailabilityMessage(`✅ ${available.length} consultorio${available.length > 1 ? 's' : ''} disponible${available.length > 1 ? 's' : ''}`)
          
          // Si hay un consultorio preseleccionado y está disponible, mantenerlo
          if (formData.room_id) {
            const preselectedAvailable = available.find((r: any) => r.room_number.toString() === formData.room_id)
            if (!preselectedAvailable) {
              setFormData(prev => ({ ...prev, room_id: '' }))
            }
          }
          
          // Si el profesional tiene consultorio preferido y está disponible, seleccionarlo
          const selectedProfessional = professionals.find(p => p.id === formData.professional_id)
          if (selectedProfessional) {
            const preferredRoom = available.find((r: any) => 
              r.room_number === 1 && formData.professional_id === searchParams.get('preferred_professional_id')
            )
            if (preferredRoom && !formData.room_id) {
              setFormData(prev => ({ ...prev, room_id: preferredRoom.room_number.toString() }))
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
    
    const timer = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timer)
  }, [formData.appointment_date, formData.appointment_time, formData.service_id, formData.sub_service_id, formData.professional_id, services, subServices, professionals, searchParams])

  const fetchInitialData = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Obtener servicios de medicina
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .in('name', ['Medicina Funcional', 'Medicina Estética'])
        .eq('active', true)
        .order('name')
      
      if (servicesError) throw servicesError
      setServices(servicesData || [])
      
      // Obtener sub-servicios si existen
      if (servicesData && servicesData.length > 0) {
        const serviceIds = servicesData.map(s => s.id)
        const { data: subServicesData, error: subServicesError } = await supabase
          .from('sub_services')
          .select('*')
          .in('service_id', serviceIds)
          .eq('active', true)
          .order('name')
        
        if (subServicesError) {
          console.error('Error fetching sub-services:', subServicesError)
        }
        setSubServices(subServicesData || [])
      }
      
      // Obtener profesionales
      const { data: professionalsData, error: professionalsError } = await supabase
        .from('professionals')
        .select('*')
        .eq('active', true)
        .order('full_name')
      
      if (professionalsError) throw professionalsError
      setProfessionals(professionalsData || [])
      
      // Obtener lista de clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, phone, email')
        .order('first_name')
      
      if (clientsError) throw clientsError
      setClients(clientsData || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      setError('Error al cargar los datos iniciales')
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
    setLoading(true)

    // Validaciones
    if (!formData.client_id) {
      setError('Por favor selecciona un paciente')
      setLoading(false)
      return
    }

    if (!formData.service_id) {
      setError('Por favor selecciona un servicio')
      setLoading(false)
      return
    }

    if (!formData.professional_id) {
      setError('Por favor selecciona un profesional')
      setLoading(false)
      return
    }

    if (availableRooms.length === 0) {
      setError('No hay consultorios disponibles en el horario seleccionado')
      setLoading(false)
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

      const appointmentData = {
        user_id: formData.client_id,
        service_id: formData.service_id,
        sub_service_id: formData.sub_service_id || null,
        professional_id: formData.professional_id,
        appointment_date: formData.appointment_date,
        appointment_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        status: 'confirmed',
        consultation_room_id: formData.room_id,
        notes: formData.notes,
        total_amount: selectedSubService ? parseFloat(selectedSubService.price) : selectedService.base_price,
        payment_status: 'pending'
      }
      
      console.log('Guardando cita:', appointmentData)
      
      const { error: appointmentError, data } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()

      if (appointmentError) {
        console.error('Error de Supabase:', appointmentError)
        throw appointmentError
      }
      
      console.log('Cita guardada exitosamente:', data)

      setSuccess(true)
      setTimeout(() => {
        router.push('/consultorios')
      }, 1500)
    } catch (error) {
      console.error('Error creating appointment:', error)
      setError('Error al crear la cita. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
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
          <h1 className="text-2xl font-semibold text-gray-900">Nueva Cita en Consultorio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Programa una consulta de medicina funcional o estética
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">¡Cita creada exitosamente! Redirigiendo...</p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
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
          <div className="space-y-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
                placeholderText="Selecciona una fecha"
                required
                popperPlacement="bottom-start"
                showPopperArrow={false}
                customInput={
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary cursor-pointer"
                  />
                }
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Consultorio */}
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
              disabled={availableRooms.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
            >
              <option value="">Selecciona un consultorio</option>
              {availableRooms.map(room => (
                <option key={room.room_id} value={room.room_id}>
                  {room.room_name}
                </option>
              ))}
            </select>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
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
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <Link
            href="/consultorios"
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || success || availableRooms.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
              loading || success || availableRooms.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Guardar Cita
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}