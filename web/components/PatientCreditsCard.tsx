'use client'

import { useState } from 'react'
import { CreditCard, Clock, TrendingUp, History, X } from 'lucide-react'
import { usePatientCredits, useCreditTransactions } from '@/src/hooks/usePatientCredits'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PatientCreditsCardProps {
  patientId: string
  patientName?: string
}

export default function PatientCreditsCard({ patientId, patientName }: PatientCreditsCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const { data: credits } = usePatientCredits(patientId)
  const { data: transactions = [] } = useCreditTransactions(patientId)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned': return 'text-green-600'
      case 'used': return 'text-blue-600'
      case 'expired': return 'text-red-600'
      case 'adjustment': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned': return '+'
      case 'used': return '-'
      case 'expired': return '⚠️'
      case 'adjustment': return '⚙️'
      default: return '•'
    }
  }

  if (!credits && transactions.length === 0) {
    return null // No mostrar nada si no hay créditos
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-green-800">
            Créditos Disponibles {patientName && `- ${patientName}`}
          </h3>
        </div>
        {transactions.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-green-600 hover:text-green-800 p-1 rounded-md hover:bg-green-100 transition-colors"
            title="Ver historial"
          >
            <History className="w-4 h-4" />
          </button>
        )}
      </div>

      {credits && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(credits.available_credits)}
              </div>
              <div className="text-xs text-green-600">Disponible</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700">
                {formatCurrency(credits.total_earned)}
              </div>
              <div className="text-xs text-gray-500">Total Ganado</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700">
                {formatCurrency(credits.total_used)}
              </div>
              <div className="text-xs text-gray-500">Total Usado</div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de transacciones */}
      {showHistory && transactions.length > 0 && (
        <div className="bg-white rounded-lg border border-green-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Historial de Créditos
            </h4>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-2">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-mono text-sm ${getTransactionColor(transaction.transaction_type)}`}>
                      {getTransactionIcon(transaction.transaction_type)}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                      {transaction.transaction_type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {transaction.description}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(transaction.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {credits?.available_credits && credits.available_credits > 0 && (
        <div className="mt-3 p-2 bg-green-100 rounded-lg">
          <div className="text-xs text-green-800 font-medium flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            Este crédito puede ser usado en el próximo pago de citas
          </div>
        </div>
      )}
    </div>
  )
}