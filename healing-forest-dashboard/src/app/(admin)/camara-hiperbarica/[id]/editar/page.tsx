"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { useRouter, useParams } from 'next/navigation'
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
  Trash2,
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

interface AppointmentData {
  id: string
  user_id: string
  service_id: string
  professional_id: string
  appointment_date: string
  appointment_time: string
  end_time: string
  duration_minutes: number
  hyperbaric_chamber_id: string
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
  professionals?: {
    id: string
    full_name: string
  }
}

export default function EditarSesionHiperbaricaPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityMessage, setAvailabilityMessage] = useState('')
  const [isAvailable, setIsAvailable] = useState(false)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    appointment_time: '08:00',
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

  // Verificar disponibilidad cuando cambian fecha, hora o profesional (pero no al cargar inicial)
  useEffect(() => {
    if (!loading && formData.appointment_date && formData.appointment_time && formData.professional_id) {
      checkAvailability()
    }
  }, [formData.appointment_date, formData.appointment_time, formData.professional_id])

  const fetchAppointmentData = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Obtener datos de la sesión
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()

      if (appointmentError) throw appointmentError
      if (!appointmentData) {
        setError('Sesión no encontrada')
        return
      }

      // Obtener datos relacionados
      const [profileData, serviceData, professionalData] = await Promise.all([
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
        
        // Professional
        supabase
          .from('professionals')
          .select('id, full_name')
          .eq('id', appointmentData.professional_id)
          .single()
      ])

      const fullAppointment: AppointmentData = {
        ...appointmentData,
        profiles: profileData.data || undefined,
        services: serviceData.data || undefined,
        professionals: professionalData.data || undefined
      }

      setAppointment(fullAppointment)

      // Inicializar form data
      setFormData({
        client_id: appointmentData.user_id,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time.slice(0, 5),
        professional_id: appointmentData.professional_id,
        notes: appointmentData.notes || '',
        status: appointmentData.status
      })

      setSelectedDate(new Date(appointmentData.appointment_date + 'T00:00:00'))

      // Obtener enfermeras
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('*')
        .eq('active', true)
        .eq('title', 'Enfermera')
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
      setError('Error al cargar los datos de la sesión')
    } finally {
      setLoading(false)
    }
  }

  const checkAvailability = async () => {
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
        setAvailabilityMessage('⚠️ La enfermera no está disponible en este horario')
        setCheckingAvailability(false)
        return
      }

      // Verificar disponibilidad de la cámara (excluyendo la sesión actual)
      const { data: chamberAvailable, error: chamberError } = await supabase
        .rpc('check_hyperbaric_availability', {
          p_date: formData.appointment_date,
          p_start_time: startTime,
          p_end_time: endTime,
          p_exclude_appointment_id: appointmentId
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

    if (!formData.professional_id) {
      setError('Por favor selecciona una enfermera')
      setSaving(false)
      return
    }

    if (!isAvailable && appointment?.appointment_date !== formData.appointment_date) {
      setError('El horario seleccionado no está disponible')
      setSaving(false)
      return
    }

    const supabase = getSupabaseBrowser()

    try {
      const startTime = `${formData.appointment_time}:00`
      const endTime = calculateEndTime(formData.appointment_time, 60)

      const updateData = {
        user_id: formData.client_id,
        professional_id: formData.professional_id,
        appointment_date: formData.appointment_date,
        appointment_time: startTime,
        end_time: endTime,
        status: formData.status,
        notes: formData.notes,
        updated_at: new Date().toISOString()
      }
      
      const { error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.push('/camara-hiperbarica')
      }, 1500)
    } catch (error) {
      console.error('Error updating appointment:', error)
      setError('Error al actualizar la sesión. Por favor intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de cancelar esta sesión?\\n\\nEsta acción no se puede deshacer.')) return

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

      router.push('/camara-hiperbarica')
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Error al cancelar la sesión. Por favor intenta de nuevo.')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando datos de la sesión...</div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Sesión no encontrada</h2>
        <Link
          href="/camara-hiperbarica"
          className="text-hf-primary hover:underline"
        >
          Volver a cámara hiperbárica
        </Link>
      </div>
    )
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
          <h1 className="text-2xl font-semibold text-gray-900">Editar Sesión de Cámara Hiperbárica</h1>
          <p className="text-sm text-gray-500 mt-1">
            Modifica los detalles de la sesión de oxigenoterapia
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">¡Sesión actualizada exitosamente! Redirigiendo...</p>
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
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
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

          {/* Estado */}
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
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary disabled:bg-gray-100"
              placeholder="Alguna información adicional sobre la sesión..."
            />
          </div>
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
            Cancelar Sesión
          </button>
          
          <div className="flex gap-3">
            <Link
              href="/camara-hiperbarica"
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Volver
            </Link>
            <button
              type="submit"
              disabled={saving || success || (!isAvailable && appointment?.appointment_date !== formData.appointment_date)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
                saving || success || (!isAvailable && appointment?.appointment_date !== formData.appointment_date)
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