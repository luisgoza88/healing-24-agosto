'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase'
import { 
  Search, 
  Filter, 
  UserPlus, 
  Eye, 
  Edit, 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  Download,
  Activity
} from 'lucide-react'
import Link from 'next/link'

interface Patient {
  id: string
  full_name: string
  email: string
  phone?: string
  date_of_birth?: string
  gender?: string
  city?: string
  address?: string
  created_at: string
  total_appointments: number
  last_appointment?: string
  medical_conditions?: string
  allergies?: string
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState('todos')
  const [cityFilter, setCityFilter] = useState('todos')
  const [cities, setCities] = useState<string[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchTerm, genderFilter, cityFilter])

  const fetchPatients = async () => {
    try {
      const { data: patientsData, error: patientsError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (patientsError) throw patientsError

      const { data: appointmentsCount, error: appointmentsError } = await supabase
        .from('appointments')
        .select('user_id, appointment_date')
        .order('appointment_date', { ascending: false })

      if (appointmentsError) throw appointmentsError

      const appointmentsByUser = appointmentsCount?.reduce((acc: any, apt) => {
        if (!acc[apt.user_id]) {
          acc[apt.user_id] = { count: 0, lastDate: apt.appointment_date }
        }
        acc[apt.user_id].count++
        return acc
      }, {})

      const formattedPatients = patientsData?.map(patient => ({
        id: patient.id,
        full_name: patient.full_name || 'Sin nombre',
        email: patient.email || '',
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        city: patient.city,
        address: patient.address,
        created_at: patient.created_at,
        total_appointments: appointmentsByUser?.[patient.id]?.count || 0,
        last_appointment: appointmentsByUser?.[patient.id]?.lastDate,
        medical_conditions: patient.medical_conditions,
        allergies: patient.allergies
      })) || []

      setPatients(formattedPatients)

      const uniqueCities = [...new Set(formattedPatients
        .map(p => p.city)
        .filter(Boolean))] as string[]
      setCities(uniqueCities)
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterPatients = () => {
    let filtered = [...patients]

    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.city?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (genderFilter !== 'todos') {
      filtered = filtered.filter(patient => patient.gender === genderFilter)
    }

    if (cityFilter !== 'todos') {
      filtered = filtered.filter(patient => patient.city === cityFilter)
    }

    setFilteredPatients(filtered)
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
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Pacientes</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/patients/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Paciente
          </Link>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, teléfono o ciudad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="todos">Todos los géneros</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="todos">Todas las ciudades</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600">Total Pacientes</div>
            <div className="text-2xl font-bold text-blue-700">{patients.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600">Nuevos este mes</div>
            <div className="text-2xl font-bold text-green-700">
              {patients.filter(p => {
                const created = new Date(p.created_at)
                const now = new Date()
                return created.getMonth() === now.getMonth() && 
                       created.getFullYear() === now.getFullYear()
              }).length}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-yellow-600">Con citas pendientes</div>
            <div className="text-2xl font-bold text-yellow-700">
              {patients.filter(p => p.total_appointments > 0).length}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600">Promedio de citas</div>
            <div className="text-2xl font-bold text-purple-700">
              {patients.length > 0 
                ? (patients.reduce((sum, p) => sum + p.total_appointments, 0) / patients.length).toFixed(1)
                : 0}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paciente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Información
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Historial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salud
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 font-medium">
                          {patient.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {patient.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Desde {formatDate(patient.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        {patient.email}
                      </div>
                      {patient.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          {patient.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {patient.date_of_birth && (
                        <div className="text-sm text-gray-900">
                          {calculateAge(patient.date_of_birth)} años
                        </div>
                      )}
                      {patient.gender && (
                        <div className="text-sm text-gray-500 capitalize">
                          {patient.gender}
                        </div>
                      )}
                      {patient.city && (
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-3 w-3 text-gray-400 mr-1" />
                          {patient.city}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {patient.total_appointments} citas
                      </div>
                      {patient.last_appointment && (
                        <div className="text-sm text-gray-500">
                          Última: {formatDate(patient.last_appointment)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {patient.medical_conditions && (
                        <div className="flex items-center text-xs text-orange-600">
                          <Activity className="h-3 w-3 mr-1" />
                          Condiciones médicas
                        </div>
                      )}
                      {patient.allergies && (
                        <div className="flex items-center text-xs text-red-600">
                          <Activity className="h-3 w-3 mr-1" />
                          Alergias
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link 
                        href={`/dashboard/patients/${patient.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/dashboard/patients/${patient.id}/edit`}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}