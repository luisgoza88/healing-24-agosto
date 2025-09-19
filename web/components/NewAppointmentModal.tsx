'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/supabase'
import { X, CreditCard, DollarSign } from 'lucide-react'
import { useProfessionals, useServices, usePatients } from '@/src/hooks/useCachedData'
import { usePatientCredits, useCreditsForAppointment } from '@/src/hooks/usePatientCredits'

interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultServiceId?: string
  defaultDate?: string
  defaultTime?: string
}

const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0)
  startDate.setMinutes(startDate.getMinutes() + durationMinutes)
  return `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`
}

export default function NewAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultServiceId,
  defaultDate,
  defaultTime,
}: NewAppointmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [useCreditsEnabled, setUseCreditsEnabled] = useState(false)
  const [creditsToUse, setCreditsToUse] = useState(0)
  const [formData, setFormData] = useState({
    patient_id: '',
    professional_id: '',
    service_id: '',
    date: '',
    time: '',
    notes: ''
  })

  const supabase = useSupabase()
  
  // Usar hooks con caché
  const { data: professionals = [], isLoading: loadingProfessionals } = useProfessionals()
  const { data: services = [], isLoading: loadingServices } = useServices()
  const { data: patients = [], isLoading: loadingPatients } = usePatients()
  
  // Credits hooks
  const { balance, summary } = usePatientCredits(formData.patient_id)

  const selectedService = services.find(s => s.id === formData.service_id)

  // Reset credits when patient changes
  useEffect(() => {
    if (formData.patient_id) {
      setUseCreditsEnabled(false)
      setCreditsToUse(0)
    }
  }, [formData.patient_id])

  // Calculate totals
  const servicePrice = selectedService?.base_price || 0
  const availableCredits = balance || 0
  const maxCreditsUsable = Math.min(availableCredits, servicePrice)
  const finalAmount = servicePrice - creditsToUse

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const appointmentData = {
        user_id: formData.patient_id,
        professional_id: formData.professional_id,
        service_id: formData.service_id,
        appointment_date: formData.date,
        appointment_time: formData.time,
        end_time: calculateEndTime(formData.time, selectedService?.duration_minutes || 60),
        duration: selectedService?.duration_minutes || 60,
        notes: formData.notes,
        status: 'pending',
        total_amount: finalAmount, // Precio después de aplicar créditos
        payment_status: creditsToUse > 0 ? (finalAmount === 0 ? 'paid' : 'partial_credit') : 'pending'
      }

      // Create the appointment first
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single()

      if (appointmentError) throw appointmentError

      // If using credits, process the credit transaction
      if (useCreditsEnabled && creditsToUse > 0) {
        const success = await useCreditsForAppointment(
          supabase,
          formData.patient_id,
          newAppointment.id,
          creditsToUse
        )
        
        if (!success) {
          throw new Error('No se pudieron aplicar los créditos')
        }
      }

      // Show success message
      let successMessage = 'Cita creada exitosamente'
      if (creditsToUse > 0) {
        successMessage += `\n\nCréditos utilizados: ${formatCurrency(creditsToUse)}`
        if (finalAmount === 0) {
          successMessage += '\nCita pagada completamente con créditos'
        } else {
          successMessage += `\nPendiente de pago: ${formatCurrency(finalAmount)}`
        }
      }
      
      alert(successMessage)
      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Error creating appointment:', error)
      alert(`Error al crear la cita: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setFormData({
        patient_id: '',
        professional_id: '',
        service_id: defaultServiceId || '',
        date: defaultDate || '',
        time: defaultTime || '',
        notes: ''
      })
      setUseCreditsEnabled(false)
      setCreditsToUse(0)
    }
  }, [isOpen, defaultServiceId, defaultDate, defaultTime])

  const handleClose = () => {
    setFormData({
      patient_id: '',
      professional_id: '',
      service_id: defaultServiceId || '',
      date: defaultDate || '',
      time: defaultTime || '',
      notes: ''
    })
    setUseCreditsEnabled(false)
    setCreditsToUse(0)
    onClose()
  }

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

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Nueva Cita</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paciente
              </label>
              <select
                required
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                disabled={loadingPatients}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">
                  {loadingPatients ? 'Cargando pacientes...' : 'Seleccionar paciente'}
                </option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name} ({patient.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servicio
              </label>
              <select
                required
                value={formData.service_id}
                onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                disabled={loadingServices}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">
                  {loadingServices ? 'Cargando servicios...' : 'Seleccionar servicio'}
                </option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {formatCurrency(service.base_price)} ({service.duration_minutes} min)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profesional
              </label>
              <select
                required
                value={formData.professional_id}
                onChange={(e) => setFormData({ ...formData, professional_id: e.target.value })}
                disabled={loadingProfessionals}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">
                  {loadingProfessionals ? 'Cargando profesionales...' : 'Seleccionar profesional'}
                </option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.full_name} - {prof.specialty || 'General'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora
                </label>
                <select
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Seleccionar hora</option>
                  {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedService && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Duración:</strong> {selectedService.duration_minutes} minutos<br/>
                  <strong>Valor:</strong> {formatCurrency(selectedService.base_price)}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Notas adicionales sobre la cita..."
              />
            </div>

            {/* Sección de Créditos */}
            {formData.patient_id && availableCredits > 0 && formData.service_id && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center mb-3">
                  <CreditCard className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="font-medium text-green-800">Créditos Disponibles</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Créditos disponibles:</span>
                    <span className="font-medium text-green-700">{formatCurrency(availableCredits)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useCredits"
                      checked={useCreditsEnabled}
                      onChange={(e) => {
                        setUseCreditsEnabled(e.target.checked)
                        if (e.target.checked) {
                          setCreditsToUse(maxCreditsUsable)
                        } else {
                          setCreditsToUse(0)
                        }
                      }}
                      className="rounded border-green-300 text-green-600 focus:ring-green-500"
                    />
                    <label htmlFor="useCredits" className="text-sm font-medium text-gray-700">
                      Usar créditos para esta cita
                    </label>
                  </div>
                  
                  {useCreditsEnabled && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600 min-w-0">Créditos a usar:</label>
                        <input
                          type="range"
                          min="0"
                          max={maxCreditsUsable}
                          step="5000"
                          value={creditsToUse}
                          onChange={(e) => setCreditsToUse(Number(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                        />
                        <input
                          type="number"
                          min="0"
                          max={maxCreditsUsable}
                          step="5000"
                          value={creditsToUse}
                          onChange={(e) => setCreditsToUse(Math.min(Number(e.target.value), maxCreditsUsable))}
                          className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 border border-green-200 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Precio del servicio:</span>
                          <span>{formatCurrency(servicePrice)}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Créditos aplicados:</span>
                          <span>-{formatCurrency(creditsToUse)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1">
                          <span>Total a pagar:</span>
                          <span>{formatCurrency(finalAmount)}</span>
                        </div>
                        {finalAmount === 0 && (
                          <div className="text-green-600 font-medium text-center bg-green-100 rounded px-2 py-1 mt-2">
                            ¡Cita pagada completamente con créditos!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || loadingPatients || loadingProfessionals || loadingServices}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Cita'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
