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
  Star
} from 'lucide-react'
import Link from 'next/link'
import { useProfessionals, useProfessionalStats, useProfessionalRevenue } from '@/hooks/useProfessionals'
import { useDebounce } from '@/hooks/useDebounce'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'

const SPECIALTIES = [
  'Medicina General',
  'Medicina Integrativa',
  'Terapia Neural',
  'Homeopatía',
  'Acupuntura',
  'Osteopatía',
  'Psicología',
  'Nutrición',
  'Fisioterapia',
  'Masaje Terapéutico'
]

export default function ProfessionalsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('todos')
  const [currentPage, setCurrentPage] = useState(1)
  
  // Debounce search
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // React Query hooks
  const { data, isLoading, error, refetch } = useProfessionals({
    searchTerm: debouncedSearchTerm,
    specialtyFilter,
    page: currentPage
  })
  
  const { data: stats } = useProfessionalStats()
  const { data: topProfessionals } = useProfessionalRevenue()
  
  const professionals = data?.professionals || []
  const totalPages = data?.totalPages || 1

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setSpecialtyFilter('todos')
    setCurrentPage(1)
  }

  if (error) {
    return <ErrorState message="Error al cargar los profesionales" onRetry={refetch} />
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Profesionales</h1>
          <p className="text-sm text-gray-600 mt-1">Panel administrativo - Equipo médico y terapéutico</p>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/dashboard/professionals/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Nuevo Profesional
          </Link>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : (
        <>
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Profesionales</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Activos este Mes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.active || 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Con Citas Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.withAppointmentsToday || 0}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Top Profesionales por Ingresos */}
          {topProfessionals && topProfessionals.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Profesionales (Últimos 30 días)</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {topProfessionals.map((prof, index) => (
                  <div key={prof.id} className="text-center">
                    <div className="text-sm text-gray-600">{index + 1}. {prof.name}</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(prof.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={specialtyFilter}
                onChange={(e) => {
                  setSpecialtyFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="todos">Todas las especialidades</option>
                {SPECIALTIES.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
              
              <button 
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          {/* Tabla de profesionales */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {professionals.length === 0 ? (
              <EmptyState 
                message="No se encontraron profesionales" 
                action={{
                  label: "Añadir Profesional",
                  onClick: () => window.location.href = '/dashboard/professionals/new'
                }}
              />
            ) : (
              <>
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
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {professionals.map((professional) => (
                        <tr key={professional.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                  <span className="text-green-600 font-medium">
                                    {professional.full_name?.charAt(0).toUpperCase() || '?'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {professional.full_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {professional.title || 'Profesional'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(professional.specialties || []).map((specialty, index) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {specialty}
                                </span>
                              ))}
                              {(!professional.specialties || professional.specialties.length === 0) && (
                                <span className="text-sm text-gray-500">Sin especialidades</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-gray-400" />
                              {professional.email || 'Sin email'}
                            </div>
                            {professional.phone && (
                              <div className="text-sm text-gray-500 flex items-center mt-1">
                                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                {professional.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isLoading}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === 1 || isLoading
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      Anterior
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(pageNum)}
                            disabled={isLoading}
                            className={`w-10 h-10 rounded-lg transition-colors ${
                              pageNum === currentPage
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || isLoading}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === totalPages || isLoading
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}