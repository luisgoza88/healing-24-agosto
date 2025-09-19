'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient, useSupabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Activity,
  AlertCircle,
  Edit,
  Clock,
  FileText,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { formatDateString } from '@/src/lib/dateUtils'
import PatientCreditsCard from '@/components/PatientCreditsCard'

interface PatientDetail {
  id: string
  full_name: string
  email: string
  phone?: string
  date_of_birth?: string
  gender?: string
  address?: string
  city?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_conditions?: string
  allergies?: string
  bio?: string
  created_at: string
  updated_at: string
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  service_name?: string
  professional_name?: string
  total_amount: number
  payment_status?: string
}

interface Stats {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  totalSpent: number
  averagePerVisit: number
  lastVisit?: string
  nextAppointment?: Appointment
}

export default function PatientDetailPage() {
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalSpent: 0,
    averagePerVisit: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'appointments' | 'medical'>('info')
  const router = useRouter()
  const params = useParams()
  const supabase = useSupabase()

  useEffect(() => {
    if (params.id) {
      fetchPatientDetail(params.id as string)
      fetchPatientAppointments(params.id as string)
    }
  }, [params.id])

  const fetchPatientDetail = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setPatient(data)
    } catch (error) {
      console.error('Error fetching patient:', error)
      router.push('/dashboard/patients')
    }
  }

  const fetchPatientAppointments = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(name),
          professional:professionals(full_name)
        `)
        .eq('user_id', userId)
        .order('appointment_date', { ascending: false })

      if (error) throw error

      const formattedAppointments = data?.map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        service_name: apt.service?.name,
        professional_name: apt.professional?.full_name,
        total_amount: apt.total_amount || 0,
        payment_status: apt.payment_status
      })) || []

      setAppointments(formattedAppointments)
      calculateStats(formattedAppointments)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (appointments: Appointment[]) => {
    const completed = appointments.filter(a => a.status === 'completed')
    const cancelled = appointments.filter(a => a.status === 'cancelled')
    const paid = appointments.filter(a => a.payment_status === 'paid')
    const totalSpent = paid.reduce((sum, a) => sum + a.total_amount, 0)
    
    const futureAppointments = appointments.filter(a => 
      new Date(a.appointment_date) >= new Date() && 
      a.status !== 'cancelled'
    )

    const pastAppointments = appointments.filter(a =>
      new Date(a.appointment_date) < new Date() &&
      a.status === 'completed'
    )

    setStats({
      totalAppointments: appointments.length,
      completedAppointments: completed.length,
      cancelledAppointments: cancelled.length,
      totalSpent,
      averagePerVisit: completed.length > 0 ? totalSpent / completed.length : 0,
      lastVisit: pastAppointments[0]?.appointment_date,
      nextAppointment: futureAppointments[futureAppointments.length - 1]
    })
  }

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const formatDate = (dateString: string) => {
    return formatDateString(dateString, { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p>No se encontró el paciente</p>
        <Link href="/dashboard/patients" className="text-green-600 hover:text-green-700">
          Volver a pacientes
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/dashboard/patients"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver a pacientes
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mr-6">
                <span className="text-3xl font-medium text-green-600">
                  {patient.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{patient.full_name}</h1>
                <p className="text-gray-500">Paciente desde {new Date(patient.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <Link
              href={`/dashboard/patients/${patient.id}/edit`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Link>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Citas Totales</p>
                <p className="text-2xl font-bold text-blue-700">{stats.totalAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Completadas</p>
                <p className="text-2xl font-bold text-green-700">{stats.completedAppointments}</p>
              </div>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Total Gastado</p>
                <p className="text-2xl font-bold text-purple-700">${stats.totalSpent.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Promedio/Visita</p>
                <p className="text-2xl font-bold text-yellow-700">${stats.averagePerVisit.toFixed(0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de Créditos */}
      <div className="mb-6">
        <PatientCreditsCard 
          patientId={patient.id} 
          patientName={patient.full_name}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Información Personal
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'appointments'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Historial de Citas
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'medical'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Información Médica
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos Personales</h3>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{patient.email}</p>
                  </div>
                </div>
                {patient.phone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Teléfono</p>
                      <p className="font-medium">{patient.phone}</p>
                    </div>
                  </div>
                )}
                {patient.date_of_birth && (
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
                      <p className="font-medium">
                        {formatDate(patient.date_of_birth)} ({calculateAge(patient.date_of_birth)} años)
                      </p>
                    </div>
                  </div>
                )}
                {patient.gender && (
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Género</p>
                      <p className="font-medium capitalize">{patient.gender}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ubicación y Contacto</h3>
                {(patient.address || patient.city) && (
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Dirección</p>
                      <p className="font-medium">
                        {patient.address && <span>{patient.address}<br /></span>}
                        {patient.city}
                      </p>
                    </div>
                  </div>
                )}
                {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-gray-400 mr-3 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Contacto de Emergencia</p>
                      <p className="font-medium">{patient.emergency_contact_name}</p>
                      <p className="text-sm text-gray-600">{patient.emergency_contact_phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {patient.bio && (
                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notas</h3>
                  <p className="text-gray-600">{patient.bio}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div>
              {stats.nextAppointment && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-green-800 mb-2">Próxima Cita</h4>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-green-700">
                        {formatDate(stats.nextAppointment.appointment_date)} a las {stats.nextAppointment.appointment_time}
                      </p>
                      <p className="text-sm text-green-600">
                        {stats.nextAppointment.service_name} con {stats.nextAppointment.professional_name}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/appointments/${stats.nextAppointment.id}`}
                      className="text-green-700 hover:text-green-800"
                    >
                      Ver detalles →
                    </Link>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Servicio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profesional
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(appointment.appointment_date).toLocaleDateString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                {appointment.appointment_time}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {appointment.service_name || 'Servicio general'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {appointment.professional_name || 'No asignado'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${appointment.total_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/dashboard/appointments/${appointment.id}`}
                            className="text-green-600 hover:text-green-900"
                          >
                            Ver detalles
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-6">
              {patient.medical_conditions && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Activity className="h-5 w-5 text-orange-600 mr-3 mt-1" />
                    <div>
                      <h4 className="font-semibold text-orange-800 mb-2">Condiciones Médicas</h4>
                      <p className="text-orange-700 whitespace-pre-wrap">{patient.medical_conditions}</p>
                    </div>
                  </div>
                </div>
              )}

              {patient.allergies && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-1" />
                    <div>
                      <h4 className="font-semibold text-red-800 mb-2">Alergias</h4>
                      <p className="text-red-700 whitespace-pre-wrap">{patient.allergies}</p>
                    </div>
                  </div>
                </div>
              )}

              {!patient.medical_conditions && !patient.allergies && (
                <div className="text-center py-12 text-gray-500">
                  No hay información médica registrada
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}