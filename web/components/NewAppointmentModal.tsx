'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase'
import { X } from 'lucide-react'

interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Professional {
  id: string
  name: string
  specialty: string
}

interface Patient {
  id: string
  full_name: string
  email: string
}

const SERVICES = [
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

const SERVICE_PRICES: { [key: string]: number } = {
  'Medicina General': 150000,
  'Medicina Integrativa': 200000,
  'Terapia Neural': 180000,
  'Homeopatía': 150000,
  'Acupuntura': 120000,
  'Osteopatía': 180000,
  'Psicología': 150000,
  'Nutrición': 120000,
  'Fisioterapia': 100000,
  'Masaje Terapéutico': 100000
}

const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0)
  startDate.setMinutes(startDate.getMinutes() + durationMinutes)
  return `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`
}

export default function NewAppointmentModal({ isOpen, onClose, onSuccess }: NewAppointmentModalProps) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    professional_id: '',
    service: '',
    date: '',
    time: '',
    notes: ''
  })

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchProfessionals()
      fetchPatients()
    }
  }, [isOpen])

  const fetchProfessionals = async () => {
    const { data } = await supabase
      .from('professionals')
      .select('id, full_name, title')
      .eq('active', true)
      .order('full_name')

    setProfessionals(data?.map(p => ({
      id: p.id,
      name: p.full_name,
      specialty: p.title || 'Profesional'
    })) || [])
  }

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
      // First, get the service_id from the service name
      const { data: serviceData } = await supabase
        .from('services')
        .select('id')
        .eq('name', formData.service)
        .single()

      const appointmentData = {
        user_id: formData.patient_id,
        professional_id: formData.professional_id,
        service_id: serviceData?.id || null,
        appointment_date: formData.date,
        appointment_time: formData.time,
        end_time: calculateEndTime(formData.time, 60), // 60 min default
        duration: 60,
        notes: formData.notes,
        status: 'pending',
        total_amount: SERVICE_PRICES[formData.service] || 0,
        payment_status: 'pending'
      }

      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData])

      if (error) throw error

      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Error creating appointment:', error)
      alert(`Error al crear la cita: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      patient_id: '',
      professional_id: '',
      service: '',
      date: '',
      time: '',
      notes: ''
    })
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
                Servicio
              </label>
              <select
                required
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar servicio</option>
                {SERVICES.map((service) => (
                  <option key={service} value={service}>
                    {service} - ${SERVICE_PRICES[service]?.toLocaleString('es-CO') || '0'}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar profesional</option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name} - {prof.specialty}
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

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
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