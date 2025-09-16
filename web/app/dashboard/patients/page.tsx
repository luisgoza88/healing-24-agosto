'use client'

import { useState } from 'react'
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
  Activity,
  Loader2,
  Users,
  TrendingUp,
  UserCheck,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { usePatients, usePatientStats, useCities } from '@/src/hooks/usePatients'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import NewPatientModal from '@/components/NewPatientModal'

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState('todos')
  const [cityFilter, setCityFilter] = useState('todos')
  const [showNewModal, setShowNewModal] = useState(false)

  // React Query hooks
  const { data: patients = [], isLoading } = usePatients({
    searchTerm,
    gender: genderFilter,
    city: cityFilter,
  })
  
  const { data: stats } = usePatientStats()
  const { data: cities = [] } = useCities()

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (date?: string) => {
    if (!date) return 'N/A'
    return format(new Date(date), 'dd/MM/yyyy')
  }

  const exportToCSV = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Fecha Nacimiento', 'Género', 'Total Citas', 'Última Cita']
    const rows = patients.map(patient => [
      patient.full_name,
      patient.email,
      patient.phone || '',
      patient.city || '',
      patient.date_of_birth || '',
      patient.gender || '',
      patient.total_appointments.toString(),
      patient.last_appointment || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pacientes_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'male': return 'Masculino'
      case 'female': return 'Femenino'
      case 'other': return 'Otro'
      default: return 'No especificado'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
          <div className="flex space-x-2">
            <button
              onClick={exportToCSV}
              disabled={patients.length === 0}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 hover:shadow-md transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              <span>Exportar</span>
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-500 text-white px-5 py-2.5 rounded-lg hover:from-green-700 hover:to-green-600 transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
            >
              <UserPlus className="w-5 h-5" />
              <span>Nuevo Paciente</span>
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Pacientes</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nuevos Este Mes</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">{stats.newThisMonth}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Con Citas</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">{stats.withAppointments}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <UserCheck className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Activos (3 meses)</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">{stats.activePatients}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Activity className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
              >
                <option value="todos">Todos los géneros</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </div>
            
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
              >
                <option value="todos">Todas las ciudades</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => {
                setSearchTerm('')
                setGenderFilter('todos')
                setCityFilter('todos')
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Lista de pacientes */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-gray-600">Cargando pacientes...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron pacientes con los filtros aplicados</p>
            </div>
          ) : (
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
                      Información Personal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Historial
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 hover:shadow-sm">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{patient.full_name}</div>
                          <div className="text-sm text-gray-500">
                            Registro: {format(new Date(patient.created_at), "dd MMM yyyy", { locale: es })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {patient.email && (
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {patient.email}
                            </div>
                          )}
                          {patient.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.city && (
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              {patient.city}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1 text-sm">
                          <div className="text-gray-900">
                            {getGenderText(patient.gender)}
                          </div>
                          {patient.date_of_birth && (
                            <div className="text-gray-600">
                              {calculateAge(patient.date_of_birth)} años
                            </div>
                          )}
                          {(patient.medical_conditions || patient.allergies) && (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              ⚕️ Info médica
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">{patient.total_appointments}</span>
                            <span className="text-gray-600 ml-1">citas</span>
                          </div>
                          {patient.last_appointment && (
                            <div className="text-xs text-gray-600">
                              Última: {format(new Date(patient.last_appointment + 'T00:00:00'), "dd MMM yyyy", { locale: es })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center space-x-2">
                          <Link
                            href={`/dashboard/patients/${patient.id}`}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1.5 rounded-lg transition-all duration-200"
                            title="Ver detalles"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <Link
                            href={`/dashboard/patients/${patient.id}/edit`}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-all duration-200"
                            title="Editar"
                          >
                            <Edit className="w-5 h-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal para nuevo paciente */}
      <NewPatientModal 
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={() => {
          setShowNewModal(false)
          // La recarga se maneja con React Query invalidation
        }}
      />
    </div>
  )
}