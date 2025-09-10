'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  DollarSign, 
  FileText,
  Edit,
  Save,
  X
} from 'lucide-react'
import Link from 'next/link'

interface AppointmentDetail {
  id: string
  date: string
  time: string
  service: string
  professional_id: string
  professional: {
    name: string
    specialty: string
    email: string
  }
  user_id: string
  patient: {
    full_name: string
    email: string
    phone?: string
  }
  status: 'confirmada' | 'pendiente' | 'cancelada' | 'completada'
  notes?: string
  amount: number
  payment_status?: 'pendiente' | 'pagado'
  payment_method?: string
  created_at: string
  updated_at: string
}

export default function AppointmentDetailPage() {
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    status: '',
    notes: '',
    payment_status: ''
  })
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchAppointmentDetail(params.id as string)
    }
  }, [params.id])

  const fetchAppointmentDetail = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          professional:professionals(name, specialty, email),
          patient:profiles(full_name, email, phone)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      setAppointment(data as AppointmentDetail)
      setFormData({
        status: data.status,
        notes: data.notes || '',
        payment_status: data.payment_status || 'pendiente'
      })
    } catch (error) {
      console.error('Error fetching appointment:', error)
      router.push('/dashboard/appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!appointment) return

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: formData.status,
          notes: formData.notes,
          payment_status: formData.payment_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id)

      if (error) throw error

      await fetchAppointmentDetail(appointment.id)
      setEditing(false)
    } catch (error) {
      console.error('Error updating appointment:', error)
    }
  }

  const handleCancel = async () => {
    if (!appointment) return
    
    if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ 
            status: 'cancelada',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id)

        if (error) throw error

        router.push('/dashboard/appointments')
      } catch (error) {
        console.error('Error canceling appointment:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmada':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'completada':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
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
        <p>No se encontró la cita</p>
        <Link href="/dashboard/appointments" className="text-green-600 hover:text-green-700">
          Volver a citas
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/dashboard/appointments"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver a citas
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Detalle de Cita</h1>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button
                    onClick={handleUpdate}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </button>
                  {appointment.status !== 'cancelada' && (
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancelar Cita
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Información de la Cita</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha</p>
                    <p className="font-medium">{formatDate(appointment.date)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Hora</p>
                    <p className="font-medium">{appointment.time}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Servicio</p>
                    <p className="font-medium">{appointment.service}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Estado</p>
                  {editing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Información del Paciente</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{appointment.patient.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{appointment.patient.email}</p>
                  </div>
                </div>
                {appointment.patient.phone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Teléfono</p>
                      <p className="font-medium">{appointment.patient.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Profesional Asignado</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{appointment.professional.name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Especialidad</p>
                    <p className="font-medium">{appointment.professional.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{appointment.professional.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Información de Pago</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Monto</p>
                    <p className="font-medium">${appointment.amount.toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Estado de Pago</p>
                  {editing ? (
                    <select
                      value={formData.payment_status}
                      onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      appointment.payment_status === 'pagado'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {appointment.payment_status === 'pagado' ? 'Pagado' : 'Pendiente'}
                    </span>
                  )}
                </div>
                {appointment.payment_method && (
                  <div>
                    <p className="text-sm text-gray-500">Método de Pago</p>
                    <p className="font-medium">{appointment.payment_method}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Notas</h2>
            {editing ? (
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={4}
                placeholder="Agregar notas sobre la cita..."
              />
            ) : (
              <p className="text-gray-600">
                {appointment.notes || 'No hay notas para esta cita'}
              </p>
            )}
          </div>

          <div className="border-t pt-6 text-sm text-gray-500">
            <p>Creada el: {new Date(appointment.created_at).toLocaleString('es-ES')}</p>
            {appointment.updated_at && (
              <p>Última actualización: {new Date(appointment.updated_at).toLocaleString('es-ES')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}