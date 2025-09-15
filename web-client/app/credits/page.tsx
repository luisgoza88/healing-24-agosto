'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  History,
  Gift,
  Calendar,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface UserCredit {
  id: string
  user_id: string
  amount: number
  credit_type: 'cancellation' | 'refund' | 'promotion' | 'admin_adjustment'
  description?: string
  expires_at?: string
  is_used: boolean
  used_at?: string
  used_in_appointment_id?: string
  source_appointment_id?: string
  created_at: string
  updated_at: string
}

interface CreditTransaction {
  id: string
  user_id: string
  credit_id?: string
  transaction_type: 'earned' | 'used' | 'expired' | 'refunded'
  amount: number
  balance_before: number
  balance_after: number
  description?: string
  appointment_id?: string
  created_at: string
}

export default function CreditsPage() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [credits, setCredits] = useState<UserCredit[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'credits' | 'history'>('credits')

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    loadCreditsData()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
    }
  }

  const loadCreditsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Cargar balance actual
      await loadBalance(user.id)
      
      // Cargar créditos
      await loadCredits(user.id)
      
      // Cargar historial de transacciones
      await loadTransactions(user.id)
    } catch (error) {
      console.error('Error loading credits data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBalance = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('amount')
        .eq('user_id', userId)
        .eq('is_used', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

      if (error) throw error

      const totalBalance = data?.reduce((sum, credit) => sum + parseFloat(credit.amount.toString()), 0) || 0
      setBalance(totalBalance)
    } catch (error) {
      console.error('Error loading balance:', error)
    }
  }

  const loadCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCredits(data || [])
    } catch (error) {
      console.error('Error loading credits:', error)
    }
  }

  const loadTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })
  }

  const getCreditTypeIcon = (type: string) => {
    switch (type) {
      case 'cancellation':
        return <Calendar className="w-5 h-5" />
      case 'refund':
        return <CreditCard className="w-5 h-5" />
      case 'promotion':
        return <Gift className="w-5 h-5" />
      case 'admin_adjustment':
        return <CheckCircle className="w-5 h-5" />
      default:
        return <Wallet className="w-5 h-5" />
    }
  }

  const getCreditTypeLabel = (type: string) => {
    const labels = {
      cancellation: 'Cancelación',
      refund: 'Reembolso',
      promotion: 'Promoción',
      admin_adjustment: 'Ajuste Administrativo'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getCreditTypeColor = (type: string) => {
    const colors = {
      cancellation: 'bg-blue-100 text-blue-800',
      refund: 'bg-green-100 text-green-800',
      promotion: 'bg-purple-100 text-purple-800',
      admin_adjustment: 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'used':
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      case 'expired':
        return <Clock className="w-4 h-4 text-orange-600" />
      case 'refunded':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <History className="w-4 h-4 text-gray-600" />
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      earned: 'Ganado',
      used: 'Usado',
      expired: 'Expirado',
      refunded: 'Reembolsado'
    }
    return labels[type as keyof typeof labels] || type
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Cargando tus créditos...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link 
            href="/profile" 
            className="mr-4 p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Créditos</h1>
            <p className="text-gray-600 mt-1">
              Gestiona y utiliza tus créditos disponibles
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white mb-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <Wallet className="w-8 h-8 mr-3" />
                <h2 className="text-xl font-semibold">Balance Disponible</h2>
              </div>
              <div className="text-4xl font-bold mb-2">
                {formatCurrency(balance)}
              </div>
              <p className="text-emerald-100">
                Usa tus créditos en tu próxima reserva
              </p>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-sm opacity-90">Créditos activos</div>
                <div className="text-2xl font-bold">
                  {credits.filter(c => !c.is_used && (!c.expires_at || new Date(c.expires_at) > new Date())).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('credits')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'credits'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Mis Créditos
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Historial
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'credits' ? (
              <div className="space-y-4">
                {credits.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No tienes créditos
                    </h3>
                    <p className="text-gray-600">
                      Los créditos se generan automáticamente cuando cancelas una cita
                    </p>
                  </div>
                ) : (
                  credits.map((credit) => {
                    const isExpired = credit.expires_at && new Date(credit.expires_at) < new Date()
                    const isUsed = credit.is_used
                    
                    return (
                      <div 
                        key={credit.id} 
                        className={`border rounded-xl p-6 transition-all hover:shadow-md ${
                          isUsed || isExpired ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className={`p-3 rounded-lg ${
                              isUsed || isExpired ? 'bg-gray-200' : 'bg-emerald-100'
                            }`}>
                              {getCreditTypeIcon(credit.credit_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className={`text-lg font-semibold ${
                                  isUsed || isExpired ? 'text-gray-600' : 'text-gray-900'
                                }`}>
                                  {formatCurrency(credit.amount)}
                                </h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  getCreditTypeColor(credit.credit_type)
                                }`}>
                                  {getCreditTypeLabel(credit.credit_type)}
                                </span>
                              </div>
                              {credit.description && (
                                <p className={`mb-3 ${
                                  isUsed || isExpired ? 'text-gray-500' : 'text-gray-700'
                                }`}>
                                  {credit.description}
                                </p>
                              )}
                              <div className="flex items-center text-sm text-gray-500 space-x-4">
                                <span>Creado: {formatDate(credit.created_at)}</span>
                                {credit.expires_at && (
                                  <span className={isExpired ? 'text-red-600' : ''}>
                                    {isExpired ? 'Expiró' : 'Expira'}: {formatDate(credit.expires_at)}
                                  </span>
                                )}
                                {isUsed && credit.used_at && (
                                  <span>Usado: {formatDate(credit.used_at)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            {isUsed ? (
                              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                                Usado
                              </span>
                            ) : isExpired ? (
                              <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-medium">
                                Expirado
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                                Disponible
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Sin historial
                    </h3>
                    <p className="text-gray-600">
                      Aquí aparecerán todas las transacciones de créditos
                    </p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-xl p-6 bg-white hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getTransactionTypeIcon(transaction.transaction_type)}
                            <span className="font-medium text-gray-900">
                              {getTransactionTypeLabel(transaction.transaction_type)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-semibold ${
                            transaction.transaction_type === 'earned' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {transaction.transaction_type === 'earned' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </div>
                          <div className="text-sm text-gray-500">
                            Balance: {formatCurrency(transaction.balance_after)}
                          </div>
                        </div>
                      </div>
                      {transaction.description && (
                        <div className="mt-3 text-gray-700 text-sm">
                          {transaction.description}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* How to use credits */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ¿Cómo usar mis créditos?
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">1. Reserva tu cita</div>
                <div>Selecciona el servicio que deseas y agenda tu cita como siempre</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">2. Aplica tus créditos</div>
                <div>En el proceso de pago, selecciona usar créditos disponibles</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">3. Confirma tu reserva</div>
                <div>Tus créditos se aplicarán automáticamente al total a pagar</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}