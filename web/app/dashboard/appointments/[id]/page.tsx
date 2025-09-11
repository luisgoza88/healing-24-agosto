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
  MapPin,
  Phone,
  Mail,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'

interface AppointmentDetail {
  id: string
  appointment_date: string
  appointment_time: string
  end_time: string
  duration: number
  status: string
  payment_status: string
  total_amount: number
  notes?: string
  created_at: string
  updated_at: string
  // Relations
  patient: {
    id: string
    full_name: string
    email: string
    phone?: string
    date_of_birth?: string
    gender?: string
    city?: string
  }
  professional: {
    id: string
    full_name: string
    title?: string
    specialties?: string[]
    email?: string
    phone?: string
  }
  service: {
    id: string
    name: string
    description?: string
    duration: number
    price: number
  }
}

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  // Unwrap the params Promise using React's use() hook
  const { id } = use(params)

  useEffect(() => {
    fetchAppointmentDetail()
  }, [id])

  const fetchAppointmentDetail = async () => {
    try {
      // Primero obtenemos la cita básica
      const { data: apt, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !apt) {
        console.error('Error fetching appointment:', error)
        router.push('/dashboard/appointments')
        return
      }

      // Luego obtenemos los datos relacionados
      const [patientRes, professionalRes, serviceRes] = await Promise.all([
        apt.user_id ? supabase
          .from('profiles')
          .select('*')
          .eq('id', apt.user_id)
          .single() : null,
        apt.professional_id ? supabase
          .from('professionals')
          .select('*')
          .eq('id', apt.professional_id)
          .single() : null,
        apt.service_id ? supabase
          .from('services')
          .select('*')
          .eq('id', apt.service_id)
          .single() : null
      ])

      setAppointment({
        ...apt,
        patient: patientRes?.data || {
          id: apt.user_id,
          full_name: 'Paciente no encontrado',
          email: 'N/A'
        },
        professional: professionalRes?.data || {
          id: apt.professional_id,
          full_name: 'Profesional no asignado'
        },
        service: serviceRes?.data || {
          id: apt.service_id,
          name: 'Servicio general',
          duration: 60,
          price: 0
        }
      })
    } catch (error) {
      console.error('Error fetching appointment:', error)
      router.push('/dashboard/appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!appointment) return
    
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointment.id)

      if (error) throw error

      setAppointment({ ...appointment, status: newStatus })
      
      // Invalidar el cache de React Query para que se actualice la lista
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!appointment) return
    
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ payment_status: newStatus })
        .eq('id', appointment.id)

      if (error) throw error

      setAppointment({ ...appointment, payment_status: newStatus })
      
      // Invalidar el cache de React Query para que se actualice la lista
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })
    } catch (error) {
      console.error('Error updating payment status:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!appointment) return
    
    if (!confirm('¿Está seguro de eliminar esta cita?')) return

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id)

      if (error) throw error

      // Invalidar el cache antes de navegar
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })
      
      router.push('/dashboard/appointments')
    } catch (error) {
      console.error('Error deleting appointment:', error)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return 'N/A'
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return `${age} años`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'no_show': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">No se encontró la cita</p>
        <Link href="/dashboard/appointments" className="text-blue-600 hover:underline mt-4 inline-block">
          Volver a citas
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard/appointments"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Detalle de Cita</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/appointments/${appointment.id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Información general */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Fecha</p>
              <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Horario</p>
              <p className="font-medium">
                {appointment.appointment_time} - {appointment.end_time} ({appointment.duration} min)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 mb-1">Estado de la cita</p>
              <select
                value={appointment.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}
              >
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
                <option value="no_show">No asistió</option>
              </select>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CreditCard className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600 mb-1">Estado del pago</p>
              <select
                value={appointment.payment_status || 'pending'}
                onChange={(e) => handlePaymentStatusChange(e.target.value)}
                disabled={updating}
                className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(appointment.payment_status || 'pending')}`}
              >
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="failed">Fallido</option>
                <option value="refunded">Reembolsado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Información del servicio */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Servicio</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">{appointment.service.name}</p>
              {appointment.service.description && (
                <p className="text-sm text-gray-600 mt-1">{appointment.service.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">Duración: {appointment.service.duration} minutos</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(appointment.total_amount)}</p>
              <p className="text-sm text-gray-500">Precio del servicio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de paciente y profesional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información del paciente */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Paciente</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">{appointment.patient.full_name}</p>
                <p className="text-sm text-gray-600">
                  {appointment.patient.gender === 'male' ? 'Masculino' : 
                   appointment.patient.gender === 'female' ? 'Femenino' : 'No especificado'} - {calculateAge(appointment.patient.date_of_birth)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <p className="text-sm">{appointment.patient.email}</p>
            </div>
            
            {appointment.patient.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <p className="text-sm">{appointment.patient.phone}</p>
              </div>
            )}
            
            {appointment.patient.city && (
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <p className="text-sm">{appointment.patient.city}</p>
              </div>
            )}

            <Link 
              href={`/dashboard/patients/${appointment.patient.id}`}
              className="inline-flex items-center text-blue-600 hover:underline text-sm mt-2"
            >
              Ver perfil completo →
            </Link>
          </div>
        </div>

        {/* Información del profesional */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profesional</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">{appointment.professional.full_name}</p>
                {appointment.professional.title && (
                  <p className="text-sm text-gray-600">{appointment.professional.title}</p>
                )}
              </div>
            </div>
            
            {appointment.professional.specialties && appointment.professional.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {appointment.professional.specialties.map((specialty, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}

            {appointment.professional.email && (
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <p className="text-sm">{appointment.professional.email}</p>
              </div>
            )}
            
            {appointment.professional.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <p className="text-sm">{appointment.professional.phone}</p>
              </div>
            )}

            <Link 
              href={`/dashboard/professionals/${appointment.professional.id}`}
              className="inline-flex items-center text-blue-600 hover:underline text-sm mt-2"
            >
              Ver perfil completo →
            </Link>
          </div>
        </div>
      </div>

      {/* Notas */}
      {appointment.notes && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
        </div>
      )}

      {/* Información del sistema */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Creado:</span> {new Date(appointment.created_at).toLocaleString('es-ES')}
          </div>
          <div>
            <span className="font-medium">ID:</span> {appointment.id}
          </div>
        </div>
      </div>
    </div>
  )
}