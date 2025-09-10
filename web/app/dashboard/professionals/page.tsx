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
  Award,
  Clock,
  Users,
  DollarSign,
  Star
} from 'lucide-react'
import Link from 'next/link'

interface Professional {
  id: string
  full_name: string
  title?: string
  specialties?: string[]
  email?: string
  phone?: string
  avatar_url?: string
  active: boolean
  created_at: string
  total_appointments?: number
  completed_appointments?: number
  average_rating?: number
  revenue?: number
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [allSpecialties, setAllSpecialties] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchProfessionals()
  }, [])

  useEffect(() => {
    filterProfessionals()
  }, [professionals, searchTerm, specialtyFilter, statusFilter])

  const fetchProfessionals = async () => {
    try {
      const { data: professionalsData, error: professionalsError } = await supabase
        .from('professionals')
        .select('*')
        .order('created_at', { ascending: false })

      if (professionalsError) throw professionalsError

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('professional_id, status, total_amount, payment_status')

      if (appointmentsError) throw appointmentsError

      const appointmentsByProfessional = appointmentsData?.reduce((acc: any, apt) => {
        if (!apt.professional_id) return acc
        
        if (!acc[apt.professional_id]) {
          acc[apt.professional_id] = {
            total: 0,
            completed: 0,
            revenue: 0
          }
        }
        
        acc[apt.professional_id].total++
        
        if (apt.status === 'completed') {
          acc[apt.professional_id].completed++
        }
        
        if (apt.payment_status === 'paid') {
          acc[apt.professional_id].revenue += apt.total_amount || 0
        }
        
        return acc
      }, {})

      const formattedProfessionals = professionalsData?.map(prof => ({
        id: prof.id,
        full_name: prof.full_name,
        title: prof.title,
        specialties: prof.specialties || [],
        email: prof.email,
        phone: prof.phone,
        avatar_url: prof.avatar_url,
        active: prof.active,
        created_at: prof.created_at,
        total_appointments: appointmentsByProfessional?.[prof.id]?.total || 0,
        completed_appointments: appointmentsByProfessional?.[prof.id]?.completed || 0,
        revenue: appointmentsByProfessional?.[prof.id]?.revenue || 0,
        average_rating: 4.5 + Math.random() * 0.5 // Simulado por ahora
      })) || []

      setProfessionals(formattedProfessionals)

      // Extraer todas las especialidades únicas
      const specialties = new Set<string>()
      formattedProfessionals.forEach(prof => {
        prof.specialties?.forEach(specialty => specialties.add(specialty))
      })
      setAllSpecialties(Array.from(specialties).sort())
    } catch (error) {
      console.error('Error fetching professionals:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterProfessionals = () => {
    let filtered = [...professionals]

    if (searchTerm) {
      filtered = filtered.filter(prof =>
        prof.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prof.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prof.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prof.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (specialtyFilter !== 'todos') {
      filtered = filtered.filter(prof => 
        prof.specialties?.includes(specialtyFilter)
      )
    }

    if (statusFilter !== 'todos') {
      filtered = filtered.filter(prof => 
        statusFilter === 'activo' ? prof.active : !prof.active
      )
    }

    setFilteredProfessionals(filtered)
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Profesionales</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/professionals/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Profesional
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, teléfono o especialidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="todos">Todas las especialidades</option>
            {allSpecialties.map(specialty => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600">Total Profesionales</div>
                <div className="text-2xl font-bold text-blue-700">{professionals.length}</div>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600">Activos</div>
                <div className="text-2xl font-bold text-green-700">
                  {professionals.filter(p => p.active).length}
                </div>
              </div>
              <Award className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-600">Citas Completadas</div>
                <div className="text-2xl font-bold text-purple-700">
                  {professionals.reduce((sum, p) => sum + (p.completed_appointments || 0), 0)}
                </div>
              </div>
              <Calendar className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-yellow-600">Ingresos Totales</div>
                <div className="text-2xl font-bold text-yellow-700">
                  {formatCurrency(professionals.reduce((sum, p) => sum + (p.revenue || 0), 0))}
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-400" />
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
                  Profesional
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Especialidades
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estadísticas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProfessionals.map((professional) => (
                <tr key={professional.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        {professional.avatar_url ? (
                          <img 
                            src={professional.avatar_url} 
                            alt={professional.full_name}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-green-600 font-medium">
                            {professional.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {professional.full_name}
                        </div>
                        {professional.title && (
                          <div className="text-sm text-gray-500">
                            {professional.title}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {professional.specialties?.slice(0, 3).map(specialty => (
                        <span 
                          key={specialty}
                          className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                      {professional.specialties && professional.specialties.length > 3 && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          +{professional.specialties.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {professional.email && (
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          {professional.email}
                        </div>
                      )}
                      {professional.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          {professional.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900">
                        {professional.total_appointments} citas totales
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        {professional.average_rating?.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(professional.revenue || 0)} generados
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      professional.active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {professional.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link 
                        href={`/dashboard/professionals/${professional.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/dashboard/professionals/${professional.id}/edit`}
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