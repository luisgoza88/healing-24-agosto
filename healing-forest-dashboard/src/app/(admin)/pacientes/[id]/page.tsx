"use client"

import React, { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft,
  User, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  FileText,
  CreditCard,
  Activity,
  Edit,
  Download,
  Clock,
  Package,
  Heart
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PatientDetails {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  date_of_birth: string | null
  address: string | null
  created_at: string
  updated_at: string
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_conditions: string | null
  allergies: string | null
  medications: string | null
  notes: string | null
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  services: {
    name: string
    duration_minutes: number
    base_price: number
  }
  professionals: {
    full_name: string
  }
}

interface Payment {
  id: string
  amount: number
  created_at: string
  payment_method: string
  status: string
  appointments: {
    services: {
      name: string
    }
  }
}

interface Credit {
  available_credits: number
  total_credits: number
  packages: {
    name: string
  }
}

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [patient, setPatient] = useState<PatientDetails | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchPatientDetails(params.id as string)
    }
  }, [params.id])

  const fetchPatientDetails = async (patientId: string) => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Fetch patient details
      const { data: patientData, error: patientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single()

      if (patientError) throw patientError
      setPatient(patientData)

      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          services:service_id(name, duration_minutes, base_price),
          professionals:professional_id(full_name)
        `)
        .eq('user_id', patientId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })

      if (appointmentsError) throw appointmentsError
      setAppointments(appointmentsData || [])

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          appointments:appointment_id(
            services:service_id(name)
          )
        `)
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })

      if (paymentsError) throw paymentsError
      setPayments(paymentsData || [])

      // Fetch credits (simplified query without join for now)
      const { data: creditsData, error: creditsError } = await supabase
        .from('patient_credits')
        .select('*')
        .eq('patient_id', patientId)

      if (creditsError) throw creditsError
      
      // For now, we'll use empty package names
      const creditsWithPackages = (creditsData || []).map(credit => ({
        ...credit,
        packages: { name: 'Paquete' } // Placeholder until we fix the relationship
      }))
      
      setCredits(creditsWithPackages)

    } catch (error) {
      console.error('Error fetching patient details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPatientName = () => {
    if (!patient) return ''
    if (patient.first_name && patient.last_name) {
      return `${patient.first_name} ${patient.last_name}`
    }
    return patient.full_name || 'Sin nombre'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada'
      case 'completed':
        return 'Completada'
      case 'cancelled':
        return 'Cancelada'
      case 'pending':
        return 'Pendiente'
      default:
        return status
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const downloadPatientReport = () => {
    // TODO: Implement patient report download
    console.log('Downloading patient report...')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando información del paciente...</div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Paciente no encontrado</p>
        <Link
          href="/pacientes"
          className="mt-4 inline-flex items-center gap-2 text-hf-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a pacientes
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/pacientes"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {getPatientName()}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Paciente desde {format(new Date(patient.created_at), 'MMMM yyyy', { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadPatientReport}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Descargar Reporte
          </button>
          <Link
            href={`/pacientes/${patient.id}/editar`}
            className="flex items-center gap-2 px-4 py-2 text-white bg-hf-primary rounded-lg hover:bg-hf-primary/90 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Citas</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {appointments.length}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Gastado</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Créditos Disponibles</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {credits.reduce((sum, c) => sum + c.available_credits, 0)}
              </p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Última Visita</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {appointments.length > 0 
                  ? format(new Date(appointments[0].appointment_date), 'dd MMM yyyy', { locale: es })
                  : 'Sin visitas'}
              </p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'info', label: 'Información Personal', icon: User },
            { id: 'medical', label: 'Historial Médico', icon: Heart },
            { id: 'appointments', label: 'Citas', icon: Calendar },
            { id: 'payments', label: 'Pagos', icon: CreditCard },
            { id: 'credits', label: 'Créditos', icon: Package }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-hf-primary text-hf-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Información de Contacto</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{patient.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="font-medium">{patient.phone_number || 'No registrado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Dirección</p>
                    <p className="font-medium">{patient.address || 'No registrada'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
                    <p className="font-medium">
                      {patient.date_of_birth 
                        ? `${format(new Date(patient.date_of_birth), 'dd/MM/yyyy')} (${calculateAge(patient.date_of_birth)} años)`
                        : 'No registrada'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Contacto de Emergencia</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">
                      {patient.emergency_contact_name || 'No registrado'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="font-medium">
                      {patient.emergency_contact_phone || 'No registrado'}
                    </p>
                  </div>
                </div>
              </div>

              {patient.notes && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
                  <p className="text-gray-600 bg-gray-50 rounded-lg p-3">
                    {patient.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Condiciones Médicas</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600">
                  {patient.medical_conditions || 'No se han registrado condiciones médicas'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Alergias</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600">
                  {patient.allergies || 'No se han registrado alergias'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Medicamentos</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600">
                  {patient.medications || 'No se han registrado medicamentos'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No hay citas registradas</p>
              </div>
            ) : (
              appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-gray-900">
                          {appointment.services.name}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(appointment.appointment_date), 'dd MMM yyyy', { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{appointment.appointment_time.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{appointment.professionals.full_name}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(appointment.services.base_price)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {appointment.services.duration_minutes} min
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No hay pagos registrados</p>
              </div>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {payment.appointments?.services?.name || 'Pago general'}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>
                          {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: es })}
                        </span>
                        <span className="capitalize">{payment.payment_method}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    <p className="font-semibold text-lg text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'credits' && (
          <div className="space-y-4">
            {credits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No hay créditos registrados</p>
              </div>
            ) : (
              credits.map((credit, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {credit.packages.name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {credit.available_credits} de {credit.total_credits} créditos disponibles
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-hf-primary h-2 rounded-full"
                          style={{
                            width: `${(credit.available_credits / credit.total_credits) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {Math.round((credit.available_credits / credit.total_credits) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}