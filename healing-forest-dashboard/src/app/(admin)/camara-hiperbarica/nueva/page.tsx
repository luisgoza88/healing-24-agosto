"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  AlertCircle,
  Save,
  CheckCircle,
  DollarSign,
  Timer,
  Heart,
  Stethoscope
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"

interface Professional {
  id: string
  full_name: string
  active: boolean
  title: string
}

export default function NuevaSesionHiperbaricaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityMessage, setAvailabilityMessage] = useState('')
  const [isAvailable, setIsAvailable] = useState(false)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [serviceId, setServiceId] = useState<string>('')
  const [chamberId, setChamberId] = useState<string>('')

  // Form state - inicializar con parámetros de URL si existen
  const [formData, setFormData] = useState({
    client_id: '',
    appointment_date: searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'),
    appointment_time: searchParams.get('time') || '08:00',
    professional_id: '',
    notes: ''
  })
  const [selectedDate, setSelectedDate] = useState<Date>(
    searchParams.get('date') ? new Date(searchParams.get('date')! + 'T00:00:00') : new Date()
  )

  // Generar opciones de tiempo cada 15 minutos de 8 AM a 6 PM (última sesión)
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

  // Verificar disponibilidad cuando cambian fecha, hora o profesional
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.appointment_date || !formData.appointment_time || !formData.professional_id) {
        setAvailabilityMessage('')
        setIsAvailable(false)
        return
      }
      
      setCheckingAvailability(true)
      setAvailabilityMessage('')
      setIsAvailable(false)
      
      const supabase = getSupabaseBrowser()
      const startTime = `${formData.appointment_time}:00`
      const endTime = calculateEndTime(formData.appointment_time, 60)
      
      // Verificar que no pase de las 7 PM
      const [endHours] = endTime.split(':').map(Number)
      if (endHours >= 19 || (endHours === 18 && endTime > '19:00:00')) {
        setAvailabilityMessage('⚠️ La sesión terminaría después de las 7:00 PM. Por favor selecciona un horario más temprano.')
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
          setAvailabilityMessage('⚠️ La enfermera no está disponible en este horario')
          setCheckingAvailability(false)
          return
        }

        // Verificar disponibilidad de la cámara hiperbárica
        const { data: chamberAvailable, error: chamberError } = await supabase
          .rpc('check_hyperbaric_availability', {
            p_date: formData.appointment_date,
            p_start_time: startTime,
            p_end_time: endTime
          })

        if (chamberError) throw chamberError
        
        if (chamberAvailable) {
          setAvailabilityMessage('✅ Horario disponible para la sesión')
          setIsAvailable(true)
        } else {
          setAvailabilityMessage('⚠️ La cámara hiperbárica está ocupada en este horario')
          setIsAvailable(false)
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
  }, [formData.appointment_date, formData.appointment_time, formData.professional_id])

  const fetchInitialData = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Obtener el servicio de cámara hiperbárica
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id')
        .eq('name', 'Cámara Hiperbárica')
        .eq('active', true)
        .single()

      if (serviceError) throw serviceError

      if (serviceData) {
        setServiceId(serviceData.id)
      }

      // Obtener la cámara hiperbárica
      const { data: chamberData, error: chamberError } = await supabase
        .from('hyperbaric_chambers')
        .select('id')
        .eq('chamber_number', 1)
        .eq('status', 'available')
        .single()

      if (chamberError) throw chamberError

      if (chamberData) {
        setChamberId(chamberData.id)
      }
      
      // Obtener enfermeras activas
      const { data: professionalsData, error: professionalsError } = await supabase
        .from('professionals')
        .select('*')
        .eq('active', true)
        .eq('title', 'Enfermera')
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

    if (!formData.professional_id) {
      setError('Por favor selecciona una enfermera')
      setLoading(false)
      return
    }

    if (!isAvailable) {
      setError('El horario seleccionado no está disponible')
      setLoading(false)
      return
    }

    if (!serviceId || !chamberId) {
      setError('Error de configuración. Por favor recarga la página.')
      setLoading(false)
      return
    }

    const supabase = getSupabaseBrowser()

    try {
      const startTime = `${formData.appointment_time}:00`
      const endTime = calculateEndTime(formData.appointment_time, 60)

      const appointmentData = {
        user_id: formData.client_id,
        service_id: serviceId,
        professional_id: formData.professional_id,
        appointment_date: formData.appointment_date,
        appointment_time: startTime,
        end_time: endTime,
        duration_minutes: 60,
        status: 'confirmed',
        hyperbaric_chamber_id: chamberId,
        notes: formData.notes,
        total_amount: 180000,
        payment_status: 'pending'
      }
      
      console.log('Guardando sesión:', appointmentData)
      
      const { error: appointmentError, data } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()

      if (appointmentError) {
        console.error('Error de Supabase:', appointmentError)
        throw appointmentError
      }
      
      console.log('Sesión guardada exitosamente:', data)

      setSuccess(true)
      setTimeout(() => {
        router.push('/camara-hiperbarica')
      }, 1500)
    } catch (error) {
      console.error('Error creating appointment:', error)
      setError('Error al crear la sesión. Por favor intenta nuevamente.')
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/camara-hiperbarica"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva Sesión de Cámara Hiperbárica</h1>
          <p className="text-sm text-gray-500 mt-1">
            Programa una sesión de oxigenoterapia hiperbárica
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">¡Sesión creada exitosamente! Redirigiendo...</p>
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

          {/* Enfermera */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-gray-400" />
                Enfermera *
              </div>
            </label>
            <select
              name="professional_id"
              value={formData.professional_id}
              onChange={(e) => setFormData(prev => ({ ...prev, professional_id: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            >
              <option value="">Selecciona una enfermera</option>
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

          {/* Service Info */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Heart className="h-5 w-5 text-blue-600" />
              Información de la Sesión
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Servicio:</span>
                <p className="font-medium">Cámara Hiperbárica</p>
              </div>
              <div>
                <span className="text-gray-600">Duración:</span>
                <p className="font-medium flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  60 minutos
                </p>
              </div>
              <div>
                <span className="text-gray-600">Precio:</span>
                <p className="font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  $180,000 COP
                </p>
              </div>
              {formData.appointment_time && (
                <div>
                  <span className="text-gray-600">Horario:</span>
                  <p className="font-medium">
                    {formData.appointment_time} - {calculateEndTime(formData.appointment_time, 60).slice(0, 5)}
                  </p>
                </div>
              )}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              placeholder="Alguna información adicional sobre la sesión..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <Link
            href="/camara-hiperbarica"
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || success || !isAvailable}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
              loading || success || !isAvailable
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
                Guardar Sesión
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}