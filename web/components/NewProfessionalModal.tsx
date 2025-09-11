'use client'

import { useState } from 'react'
import { X, Loader2, User, Mail, Phone, Award, Clock, DollarSign } from 'lucide-react'
import { supabase } from '@/src/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface NewProfessionalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const SPECIALTIES = [
  'Medicina General',
  'Cardiología',
  'Dermatología',
  'Ginecología',
  'Neurología',
  'Oftalmología',
  'Ortopedia',
  'Pediatría',
  'Psicología',
  'Psiquiatría',
  'Traumatología',
  'Urología',
  'Nutrición',
  'Fisioterapia',
  'Odontología'
]

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
]

export default function NewProfessionalModal({ isOpen, onClose, onSuccess }: NewProfessionalModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    title: '',
    specialties: [] as string[],
    license_number: '',
    consultation_fee: '',
    bio: ''
  })
  const [availability, setAvailability] = useState<Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>>([])

  if (!isOpen) return null

  const handleAddAvailability = () => {
    setAvailability([...availability, {
      day_of_week: 1,
      start_time: '09:00',
      end_time: '18:00'
    }])
  }

  const handleRemoveAvailability = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index))
  }

  const handleAvailabilityChange = (index: number, field: string, value: any) => {
    const newAvailability = [...availability]
    newAvailability[index] = { ...newAvailability[index], [field]: value }
    setAvailability(newAvailability)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        options: {
          data: {
            full_name: formData.full_name,
            role: 'professional'
          }
        }
      })

      if (authError) throw authError

      // Create professional profile
      const { data: professionalData, error: professionalError } = await supabase
        .from('professionals')
        .insert({
          user_id: authData.user!.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          title: formData.title || null,
          specialties: formData.specialties.length > 0 ? formData.specialties : null,
          license_number: formData.license_number || null,
          consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
          bio: formData.bio || null,
          active: true
        })
        .select()
        .single()

      if (professionalError) throw professionalError

      // Create availability if any
      if (availability.length > 0 && professionalData) {
        const availabilityData = availability.map(slot => ({
          professional_id: professionalData.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time
        }))

        const { error: availabilityError } = await supabase
          .from('professional_availability')
          .insert(availabilityData)

        if (availabilityError) {
          console.error('Error creating availability:', availabilityError)
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['professional-stats'] })

      // Reset form
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        title: '',
        specialties: [],
        license_number: '',
        consultation_fee: '',
        bio: ''
      })
      setAvailability([])

      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error creating professional:', error)
      alert(`Error al crear profesional: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Nuevo Profesional</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Información básica */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-600" />
              Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+57 300 123 4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título Profesional
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Dr., Dra., Lic., etc."
                />
              </div>
            </div>
          </div>

          {/* Información profesional */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-gray-600" />
              Información Profesional
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidades
                </label>
                <select
                  multiple
                  value={formData.specialties}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setFormData({ ...formData, specialties: selected })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  size={5}
                >
                  {SPECIALTIES.map(specialty => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Mantén presionado Ctrl/Cmd para seleccionar múltiples</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Licencia
                  </label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarifa de Consulta
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.consultation_fee}
                      onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="150000"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Biografía
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Breve descripción profesional..."
              />
            </div>
          </div>

          {/* Disponibilidad */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-600" />
              Disponibilidad Semanal
            </h3>
            
            <div className="space-y-3">
              {availability.map((slot, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <select
                    value={slot.day_of_week}
                    onChange={(e) => handleAvailabilityChange(index, 'day_of_week', parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                  
                  <input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => handleAvailabilityChange(index, 'start_time', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  
                  <span className="text-gray-500">a</span>
                  
                  <input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => handleAvailabilityChange(index, 'end_time', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveAvailability(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddAvailability}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors"
              >
                + Agregar horario
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transform hover:scale-105 transition-all duration-200 flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Crear Profesional
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}