'use client'

import { useState, useMemo } from 'react'
import { CreditCard, TrendingUp, Users, DollarSign, Search, Filter, Eye, Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient, useSupabase } from '@/lib/supabase'
import Link from 'next/link'
import AddManualCreditModal from '@/components/AddManualCreditModal'

interface PatientCredit {
  id: string
  patient_id: string
  available_credits: number
  total_earned: number
  total_used: number
  created_at: string
  updated_at: string
  patient: {
    full_name: string
    email: string
  }
}

interface CreditsSummary {
  totalCredits: number
  totalPatients: number
  totalEarned: number
  totalUsed: number
}

export default function CreditsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('available_credits')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showOnlyWithCredits, setShowOnlyWithCredits] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const supabase = useSupabase()
  const queryClient = useQueryClient()

  // Fetch all patient credits with patient info
  const { data: patientCredits = [], isLoading } = useQuery({
    queryKey: ['patient-credits-admin', showOnlyWithCredits],
    queryFn: async (): Promise<PatientCredit[]> => {
      let query = supabase
        .from('patient_credits')
        .select('*')

      if (showOnlyWithCredits) {
        query = query.gt('available_credits', 0)
      }

      const { data: creditsData, error } = await query.order('available_credits', { ascending: false })

      if (error) {
        console.error('Error fetching credits:', error)
        return []
      }

      // Fetch patient info separately
      if (creditsData && creditsData.length > 0) {
        const patientIds = creditsData.map(c => c.patient_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', patientIds)

        if (profilesError) throw profilesError

        // Combine the data
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
        return creditsData.map(credit => ({
          ...credit,
          patient: profilesMap.get(credit.patient_id) || { full_name: 'Usuario sin perfil', email: '' }
        }))
      }

      return []
    },
    staleTime: 30 * 1000, // 30 seconds
  })

  // Calculate summary stats
  const creditsSummary = useMemo((): CreditsSummary => {
    return {
      totalCredits: patientCredits.reduce((sum, p) => sum + p.available_credits, 0),
      totalPatients: patientCredits.length,
      totalEarned: patientCredits.reduce((sum, p) => sum + p.total_earned, 0),
      totalUsed: patientCredits.reduce((sum, p) => sum + p.total_used, 0),
    }
  }, [patientCredits])

  // Filter and sort credits
  const filteredAndSortedCredits = useMemo(() => {
    let filtered = patientCredits

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(credit =>
        credit.patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        credit.patient.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortBy as keyof PatientCredit]
      const bVal = b[sortBy as keyof PatientCredit]
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return 0
    })

    return filtered
  }, [patientCredits, searchTerm, sortBy, sortOrder])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Créditos</h1>
          <p className="text-sm text-gray-600">Administra los créditos de los pacientes</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar Crédito Manual
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 mb-1">Créditos Totales</p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(creditsSummary.totalCredits)}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 mb-1">Pacientes con Créditos</p>
              <p className="text-2xl font-bold text-blue-700">
                {creditsSummary.totalPatients}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 mb-1">Total Generado</p>
              <p className="text-2xl font-bold text-purple-700">
                {formatCurrency(creditsSummary.totalEarned)}
              </p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 mb-1">Total Utilizado</p>
              <p className="text-2xl font-bold text-orange-700">
                {formatCurrency(creditsSummary.totalUsed)}
              </p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
            >
              <option value="available_credits">Créditos Disponibles</option>
              <option value="total_earned">Total Ganado</option>
              <option value="total_used">Total Usado</option>
              <option value="created_at">Fecha Creación</option>
            </select>
          </div>

          <div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="desc">Mayor a menor</option>
              <option value="asc">Menor a mayor</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showOnlyWithCredits"
              checked={showOnlyWithCredits}
              onChange={(e) => setShowOnlyWithCredits(e.target.checked)}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="showOnlyWithCredits" className="ml-2 text-sm text-gray-700">
              Solo con créditos
            </label>
          </div>
        </div>
      </div>

      {/* Credits Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando créditos...</p>
          </div>
        ) : filteredAndSortedCredits.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron créditos con los filtros aplicados</p>
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
                    Disponible
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Ganado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Usado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Actualización
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedCredits.map((credit) => (
                  <tr key={credit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {credit.patient.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {credit.patient.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${
                        credit.available_credits > 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {formatCurrency(credit.available_credits)}
                      </div>
                      {credit.available_credits > 0 && (
                        <div className="flex items-center mt-1">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                          <span className="text-xs text-green-600">Activo</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(credit.total_earned)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(credit.total_used)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(credit.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center space-x-1">
                        <Link
                          href={`/dashboard/patients/${credit.patient_id}`}
                          className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                          title="Ver perfil del paciente"
                        >
                          <Eye className="w-4 h-4" />
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

      {filteredAndSortedCredits.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Mostrando {filteredAndSortedCredits.length} de {patientCredits.length} pacientes
        </div>
      )}

      {/* Modal para agregar crédito manual */}
      <AddManualCreditModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['patient-credits-admin'] })
        }}
      />
    </div>
  )
}