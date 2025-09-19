'use client'

import { useState, useEffect } from 'react'
import { createClient, useSupabase } from '@/lib/supabase'
import { X, CreditCard, User, DollarSign, FileText } from 'lucide-react'
import { useCreateManualCredit } from '@/src/hooks/usePatientCredits'

interface AddManualCreditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Patient {
  id: string
  full_name: string
  email: string
}

export default function AddManualCreditModal({ isOpen, onClose, onSuccess }: AddManualCreditModalProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    amount: '',
    reason: 'manual_adjustment',
    description: ''
  })

  const supabase = useSupabase()
  const createManualCredit = useCreateManualCredit()

  useEffect(() => {
    if (isOpen) {
      fetchPatients()
    }
  }, [isOpen])

  const fetchPatients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name')

    setPatients(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        alert('Por favor ingrese un monto válido mayor a 0')
        return
      }

      await createManualCredit.mutate({
        patientId: formData.patient_id,
        amount: amount,
        reason: formData.reason,
        description: formData.description || `Crédito manual de ${formatCurrency(amount)}`
      })

      alert('Crédito agregado exitosamente')
      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Error creating manual credit:', error)
      alert(`Error al crear el crédito: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      patient_id: '',
      amount: '',
      reason: 'manual_adjustment',
      description: ''
    })
    onClose()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const previewAmount = parseFloat(formData.amount) || 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleClose} />
        
        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          <div className="absolute right-4 top-4">
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center mb-6">
            <CreditCard className="h-8 w-8 text-green-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Agregar Crédito Manual</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline w-4 h-4 mr-1" />
                Paciente
              </label>
              <select
                required
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name} ({patient.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Monto del Crédito
              </label>
              <input
                type="text"
                required
                value={formData.amount}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/[^\d]/g, '')
                  setFormData({ ...formData, amount: value })
                }}
                onBlur={(e) => {
                  // Redondear a múltiplos de 1000 al salir del campo
                  const value = parseFloat(e.target.value) || 0
                  const rounded = Math.round(value / 1000) * 1000
                  if (rounded > 0) {
                    setFormData({ ...formData, amount: rounded.toString() })
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ej: 50000"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {previewAmount > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  Crédito: {formatCurrency(previewAmount)}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                El monto se redondeará al millar más cercano
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="manual_adjustment">Ajuste Manual</option>
                <option value="promotion">Promoción</option>
                <option value="compensation">Compensación</option>
                <option value="loyalty_reward">Recompensa de Fidelidad</option>
                <option value="referral_bonus">Bono por Referido</option>
                <option value="correction">Corrección</option>
                <option value="goodwill">Buena Voluntad</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="inline w-4 h-4 mr-1" />
                Descripción (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Descripción del motivo del crédito..."
              />
            </div>

            {/* Preview */}
            {formData.patient_id && previewAmount > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Vista Previa:</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Paciente:</span>
                    <span className="font-medium">
                      {patients.find(p => p.id === formData.patient_id)?.full_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Crédito a agregar:</span>
                    <span className="font-medium text-green-700">
                      {formatCurrency(previewAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Motivo:</span>
                    <span className="font-medium">
                      {formData.reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Agregando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Agregar Crédito
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}