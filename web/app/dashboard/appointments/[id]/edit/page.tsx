'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Briefcase,
  DollarSign,
  FileText,
  Save,
  X
} from 'lucide-react'
import Link from 'next/link'

interface Professional {
  id: string
  full_name: string
}

interface Service {
  id: string
  name: string
  base_price: number
  duration_minutes: number
}

interface Patient {
  id: string
  full_name: string
  email: string
}

export default function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [appointment, setAppointment] = useState<any>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [availableHours, setAvailableHours] = useState<string[]>([])
  
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  // Unwrap the params Promise using React's use() hook
  const { id } = use(params)

  const [formData, setFormData] = useState({
    user_id: '',
    professional_id: '',
    service_id: '',
    appointment_date: '',
    appointment_time: '',
    duration: 60,
    status: 'pending',
    payment_status: 'pending',
    total_amount: 0,
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    if (formData.professional_id && formData.appointment_date) {
      checkAvailability()
    }
  }, [formData.professional_id, formData.appointment_date])

  useEffect(() => {
    if (formData.service_id) {
      const service = services.find(s => s.id === formData.service_id)
      if (service) {
        // Ya que no tenemos price/duration en la tabla services,
        // mantenemos los valores actuales del appointment
        console.log('Service selected:', service)
      }
    }
  }, [formData.service_id, services])

  const loadData = async () => {
    try {
      // Cargar la cita actual
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single()

      if (aptError || !aptData) {
        console.error('Error loading appointment:', aptError)
        router.push('/dashboard/appointments')
        return
      }

      setAppointment(aptData)
      setFormData({
        user_id: aptData.user_id,
        professional_id: aptData.professional_id,
        service_id: aptData.service_id || '',
        appointment_date: aptData.appointment_date,
        appointment_time: aptData.appointment_time,
        duration: aptData.duration || 60,
        status: aptData.status,
        payment_status: aptData.payment_status || 'pending',
        total_amount: aptData.total_amount || 0,
        notes: aptData.notes || ''
      })

      // Cargar datos adicionales
      const [profsData, servicesData, patientsData] = await Promise.all([
        supabase.from('professionals').select('id, full_name').eq('active', true).order('full_name'),
        supabase.from('services').select('id, name, base_price, duration_minutes').order('name'),
        supabase.from('profiles').select('id, full_name, email').order('full_name')
      ])

      setProfessionals(profsData.data || [])
      setServices(servicesData.data || [])
      setPatients(patientsData.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkAvailability = async () => {
    try {
      // Obtener horario del profesional para el día seleccionado
      const dayOfWeek = new Date(formData.appointment_date).getDay()
      
      const { data: schedule, error: scheduleError } = await supabase
        .from('professional_availability')
        .select('start_time, end_time')
        .eq('professional_id', formData.professional_id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle()

      if (scheduleError) {
        console.error('Error fetching schedule:', scheduleError)
        setAvailableHours(generateDefaultHours())
        return
      }

      if (!schedule) {
        setAvailableHours([])
        return
      }

      // Obtener citas existentes para ese día (excluyendo la cita actual)
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('appointment_time, duration')
        .eq('professional_id', formData.professional_id)
        .eq('appointment_date', formData.appointment_date)
        .neq('id', id)
        .neq('status', 'cancelled')

      // Generar horarios disponibles
      const hours = generateAvailableHours(
        schedule.start_time,
        schedule.end_time,
        formData.duration,
        existingAppointments || []
      )
      
      setAvailableHours(hours)
    } catch (error) {
      console.error('Error checking availability:', error)
      setAvailableHours(generateDefaultHours())
    }
  }

  const generateAvailableHours = (
    startTime: string,
    endTime: string,
    duration: number,
    existingAppointments: any[]
  ): string[] => {
    const hours: string[] = []
    const start = timeToMinutes(startTime)
    const end = timeToMinutes(endTime)
    const interval = 30 // intervalos de 30 minutos

    for (let time = start; time <= end - duration; time += interval) {
      const hourString = minutesToTime(time)
      
      // Verificar si el horario está disponible
      const isAvailable = !existingAppointments.some(apt => {
        const aptStart = timeToMinutes(apt.appointment_time)
        const aptEnd = aptStart + (apt.duration || 60)
        const proposedEnd = time + duration
        
        return (time >= aptStart && time < aptEnd) || 
               (proposedEnd > aptStart && proposedEnd <= aptEnd) ||
               (time <= aptStart && proposedEnd >= aptEnd)
      })
      
      if (isAvailable) {
        hours.push(hourString)
      }
    }
    
    return hours
  }

  const generateDefaultHours = (): string[] => {
    const hours = []
    for (let h = 9; h <= 18; h++) {
      hours.push(`${h.toString().padStart(2, '0')}:00`)
      if (h < 18) hours.push(`${h.toString().padStart(2, '0')}:30`)
    }
    return hours
  }

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const calculateEndTime = (startTime: string, duration: number): string => {
    const minutes = timeToMinutes(startTime) + duration
    return minutesToTime(minutes)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updateData = {
        ...formData,
        end_time: calculateEndTime(formData.appointment_time, formData.duration),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      // Invalidar el cache de React Query para que se actualice la lista
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })

      router.push(`/dashboard/appointments/${id}`)
    } catch (error: any) {
      console.error('Error updating appointment:', error)
      alert('Error al actualizar la cita: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link 
            href={`/dashboard/appointments/${id}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Editar Cita</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la Cita</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline h-4 w-4 mr-1" />
                Paciente
              </label>
              <select
                required
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name} - {patient.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Briefcase className="inline h-4 w-4 mr-1" />
                Servicio
              </label>
              <select
                required
                value={formData.service_id}
                onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar servicio</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline h-4 w-4 mr-1" />
                Profesional
              </label>
              <select
                required
                value={formData.professional_id}
                onChange={(e) => setFormData({ ...formData, professional_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar profesional</option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Fecha
              </label>
              <input
                type="date"
                required
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline h-4 w-4 mr-1" />
                Hora
              </label>
              <select
                required
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar hora</option>
                {availableHours.length > 0 ? (
                  availableHours.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))
                ) : (
                  <option disabled>No hay horarios disponibles</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Valor Total
              </label>
              <input
                type="text"
                value={formatCurrency(formData.total_amount)}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado de la Cita
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
                <option value="no_show">No asistió</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado del Pago
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="failed">Fallido</option>
                <option value="refunded">Reembolsado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline h-4 w-4 mr-1" />
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Notas adicionales sobre la cita..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link
            href={`/dashboard/appointments/${id}`}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <X className="h-5 w-5" />
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}