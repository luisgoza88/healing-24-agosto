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
  Award,
  Clock,
  Users,
  DollarSign,
  Star,
  Loader2,
  Activity,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { useProfessionals, useProfessionalStats, useSpecialties } from '@/src/hooks/useProfessionals'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import NewProfessionalModal from '@/components/NewProfessionalModal'

export default function ProfessionalsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [showNewModal, setShowNewModal] = useState(false)

  // React Query hooks
  const { data: professionals = [], isLoading } = useProfessionals({
    searchTerm,
    specialty: specialtyFilter,
    status: statusFilter,
  })
  
  const { data: stats } = useProfessionalStats()
  const { data: specialties = [] } = useSpecialties()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calculateSuccessRate = (total?: number, completed?: number) => {
    if (!total || total === 0) return 0
    return Math.round((completed! / total) * 100)
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        Activo
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        Inactivo
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Profesionales</h1>
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-gradient-to-r from-green-600 to-green-500 text-white px-5 py-2.5 rounded-lg hover:from-green-700 hover:to-green-600 transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            <span>Nuevo Profesional</span>
          </button>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Profesionales</p>
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
                  <p className="text-sm text-gray-600 mb-1">Activos</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">{stats.active}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Trabajando Hoy</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">{stats.workingToday}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Clock className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ingresos del Mes</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">{formatCurrency(stats.monthRevenue)}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <DollarSign className="w-8 h-8 text-yellow-500" />
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
                placeholder="Buscar por nombre, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="relative">
              <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
              >
                <option value="todos">Todas las especialidades</option>
                {specialties.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                setSearchTerm('')
                setSpecialtyFilter('todos')
                setStatusFilter('todos')
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Lista de profesionales */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-gray-600">Cargando profesionales...</p>
            </div>
          ) : professionals.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron profesionales con los filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profesional
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estadísticas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Desempeño
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {professionals.map((professional) => (
                    <tr key={professional.id} className="hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 hover:shadow-sm">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {professional.avatar_url ? (
                              <img className="h-10 w-10 rounded-full" src={professional.avatar_url} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <Users className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{professional.full_name}</div>
                            {professional.title && (
                              <div className="text-sm text-gray-500">{professional.title}</div>
                            )}
                            {professional.specialty && (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 mt-1">
                                <Award className="w-3 h-3 mr-1" />
                                {professional.specialty}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {professional.email && (
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {professional.email}
                            </div>
                          )}
                          {professional.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              {professional.phone}
                            </div>
                          )}
                          <div className="mt-2">
                            {getStatusBadge(professional.active)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">{professional.total_appointments || 0}</span>
                            <span className="text-gray-600 ml-1">citas totales</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">{professional.completed_appointments || 0}</span>
                            <span className="text-gray-600 ml-1">completadas</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">
                                  {calculateSuccessRate(professional.total_appointments, professional.completed_appointments)}%
                                </span>
                                <span className="text-xs text-gray-600 ml-1">completado</span>
                              </div>
                              <div className="mt-1 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500 ease-out"
                                  style={{
                                    width: `${calculateSuccessRate(professional.total_appointments, professional.completed_appointments)}%`
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center text-sm">
                            <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                            <span className="font-medium">{formatCurrency(professional.revenue || 0)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center space-x-2">
                          <Link
                            href={`/dashboard/professionals/${professional.id}`}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1.5 rounded-lg transition-all duration-200"
                            title="Ver detalles"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <Link
                            href={`/dashboard/professionals/${professional.id}/edit`}
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

      {/* Modal para nuevo profesional */}
      <NewProfessionalModal 
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