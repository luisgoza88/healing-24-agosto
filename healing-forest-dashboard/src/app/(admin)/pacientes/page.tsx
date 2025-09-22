"use client"

import React, { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { 
  Users, 
  Search,
  Filter,
  Plus,
  UserPlus,
  Download,
  Phone,
  Mail,
  Calendar,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Patient {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  created_at: string
  updated_at: string
  last_appointment?: {
    appointment_date: string
    service: {
      name: string
    }
  }
  appointment_count?: number
  total_spent?: number
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all') // all, active, new
  const [sortBy, setSortBy] = useState('name') // name, date, appointments
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    checkAuthAndFetchPatients()
  }, [])

  const checkAuthAndFetchPatients = async () => {
    const supabase = getSupabaseBrowser()
    
    // Check if user is authenticated
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      setAuthError(true)
      setLoading(false)
      return
    }
    
    fetchPatients()
  }

  const fetchPatients = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // First, let's try a simple query to see if we can get patients
      const { data: patientsData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error details:', error)
        throw error
      }

      // If we have patients, let's get their appointments and payments separately
      const processedPatients = []
      
      for (const patient of (patientsData || [])) {
        // Get appointments for this patient
        const { data: appointments } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            service_id,
            services (
              name
            )
          `)
          .eq('user_id', patient.id)
          .order('appointment_date', { ascending: false })

        // Get payments for this patient
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('user_id', patient.id)
          .eq('status', 'completed')

        processedPatients.push({
          ...patient,
          appointment_count: appointments?.length || 0,
          total_spent: payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
          last_appointment: appointments?.[0] ? {
            appointment_date: appointments[0].appointment_date,
            service: {
              name: appointments[0].services?.name || 'Servicio'
            }
          } : undefined
        })
      }

      setPatients(processedPatients)
    } catch (error) {
      console.error('Error fetching patients:', error)
      // Even if there's an error, show empty state
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort patients
  const filteredPatients = patients
    .filter(patient => {
      const matchesSearch = searchTerm === '' || 
        (patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
         patient.phone_number?.includes(searchTerm))

      const matchesFilter = filterBy === 'all' ||
        (filterBy === 'active' && patient.appointment_count! > 0) ||
        (filterBy === 'new' && new Date(patient.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000)

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = a.first_name || a.full_name || ''
          const nameB = b.first_name || b.full_name || ''
          return nameA.localeCompare(nameB)
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'appointments':
          return (b.appointment_count || 0) - (a.appointment_count || 0)
        default:
          return 0
      }
    })

  const getPatientName = (patient: Patient) => {
    if (patient.first_name && patient.last_name) {
      return `${patient.first_name} ${patient.last_name}`
    }
    return patient.full_name || 'Sin nombre'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const exportPatients = () => {
    // Create CSV content
    const headers = ['Nombre', 'Email', 'Teléfono', 'Fecha Registro', 'Citas', 'Total Gastado']
    const rows = filteredPatients.map(patient => [
      getPatientName(patient),
      patient.email,
      patient.phone_number || '',
      format(new Date(patient.created_at), 'dd/MM/yyyy'),
      patient.appointment_count || 0,
      patient.total_spent || 0
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pacientes_${format(new Date(), 'yyyyMMdd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando pacientes...</div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No estás autenticado
          </h2>
          <p className="text-gray-600 mb-4">
            Por favor, inicia sesión para ver los pacientes
          </p>
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 px-4 py-2 text-white bg-hf-primary rounded-lg hover:bg-hf-primary/90 transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pacientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona la información de tus pacientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPatients}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <Link
            href="/pacientes/nuevo"
            className="flex items-center gap-2 px-4 py-2 text-white bg-hf-primary rounded-lg hover:bg-hf-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Paciente
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Pacientes</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{patients.length}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pacientes Activos</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {patients.filter(p => p.appointment_count! > 0).length}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <UserPlus className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Nuevos (30 días)</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {patients.filter(p => 
                  p.created_at && new Date(p.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
                ).length}
              </p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tasa Retención</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {patients.length > 0 
                  ? Math.round((patients.filter(p => p.appointment_count! > 1).length / patients.length) * 100)
                  : 0}%
              </p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <UserPlus className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="new">Nuevos (30 días)</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            >
              <option value="name">Nombre</option>
              <option value="date">Fecha registro</option>
              <option value="appointments">Nº de citas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => (
          <Link
            key={patient.id}
            href={`/pacientes/${patient.id}`}
            className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-hf-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-hf-primary">
                    {getPatientName(patient).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {getPatientName(patient)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Paciente desde {format(new Date(patient.created_at), 'MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="truncate">{patient.email}</span>
              </div>
              
              {patient.phone_number && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{patient.phone_number}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{patient.appointment_count || 0} citas</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total gastado</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(patient.total_spent || 0)}
                </span>
              </div>
              {patient.last_appointment && (
                <div className="mt-2 text-xs text-gray-500">
                  Última cita: {format(new Date(patient.last_appointment.appointment_date), 'dd MMM yyyy', { locale: es })}
                  {' - '}{patient.last_appointment.service.name}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron pacientes
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? 'Intenta con otros términos de búsqueda' 
              : 'Comienza agregando tu primer paciente'}
          </p>
          {!searchTerm && (
            <Link
              href="/pacientes/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-hf-primary rounded-lg hover:bg-hf-primary/90 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Agregar Paciente
            </Link>
          )}
        </div>
      )}
    </div>
  )
}