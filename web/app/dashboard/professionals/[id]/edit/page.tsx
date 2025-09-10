'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Phone, 
  Award,
  FileText,
  Plus,
  X,
  Clock,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

const COMMON_SPECIALTIES = [
  'Medicina General',
  'Medicina Integrativa', 
  'Terapia Neural',
  'Homeopatía',
  'Acupuntura',
  'Osteopatía',
  'Psicología',
  'Nutrición',
  'Fisioterapia',
  'Masaje Terapéutico',
  'Naturopatía',
  'Quiropráctica'
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
]

interface Schedule {
  day_of_week: number
  start_time: string
  end_time: string
  active: boolean
}

export default function EditProfessionalPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [formData, setFormData] = useState({
    full_name: '',
    title: '',
    email: '',
    phone: '',
    bio: '',
    active: true
  })
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchProfessional(params.id as string)
    }
  }, [params.id])

  const fetchProfessional = async (id: string) => {
    try {
      // Fetch professional data
      const { data: professionalData, error: professionalError } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .single()

      if (professionalError) throw professionalError

      setFormData({
        full_name: professionalData.full_name,
        title: professionalData.title || '',
        email: professionalData.email || '',
        phone: professionalData.phone || '',
        bio: professionalData.bio || '',
        active: professionalData.active
      })
      setSelectedSpecialties(professionalData.specialties || [])

      // Fetch availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', id)
        .order('day_of_week')

      if (availabilityError) console.error('Error fetching availability:', availabilityError)
      
      // Initialize schedules for all days
      const scheduleMap = new Map()
      DAYS_OF_WEEK.forEach(day => {
        scheduleMap.set(day.value, {
          day_of_week: day.value,
          start_time: '09:00',
          end_time: '18:00',
          active: false
        })
      })

      // Update with existing availability
      availabilityData?.forEach(schedule => {
        scheduleMap.set(schedule.day_of_week, {
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          active: schedule.active
        })
      })

      setSchedules(Array.from(scheduleMap.values()))
    } catch (error) {
      console.error('Error fetching professional:', error)
      router.push('/dashboard/professionals')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Update professional data
      const updateData: any = {
        full_name: formData.full_name,
        title: formData.title || null,
        specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
        email: formData.email || null,
        phone: formData.phone || null,
        bio: formData.bio || null,
        active: formData.active,
        updated_at: new Date().toISOString()
      }

      const { error: professionalError } = await supabase
        .from('professionals')
        .update(updateData)
        .eq('id', params.id)

      if (professionalError) throw professionalError

      // Update availability
      // First, delete existing availability
      const { error: deleteError } = await supabase
        .from('professional_availability')
        .delete()
        .eq('professional_id', params.id)

      if (deleteError) console.error('Error deleting availability:', deleteError)

      // Insert new availability for active schedules
      const activeSchedules = schedules
        .filter(s => s.active)
        .map(s => ({
          professional_id: params.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          active: true
        }))

      if (activeSchedules.length > 0) {
        const { error: insertError } = await supabase
          .from('professional_availability')
          .insert(activeSchedules)

        if (insertError) console.error('Error inserting availability:', insertError)
      }

      router.push(`/dashboard/professionals/${params.id}`)
    } catch (error: any) {
      console.error('Error updating professional:', error)
      setError(error.message || 'Error al actualizar el profesional')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData({
        ...formData,
        [name]: checked
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    )
  }

  const addCustomSpecialty = () => {
    if (customSpecialty.trim() && !selectedSpecialties.includes(customSpecialty.trim())) {
      setSelectedSpecialties([...selectedSpecialties, customSpecialty.trim()])
      setCustomSpecialty('')
    }
  }

  const updateSchedule = (dayOfWeek: number, field: keyof Schedule, value: any) => {
    setSchedules(prev => prev.map(s => 
      s.day_of_week === dayOfWeek
        ? { ...s, [field]: value }
        : s
    ))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link 
          href={`/dashboard/professionals/${params.id}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver al profesional
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Editar Profesional</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-400" />
                  Información Profesional
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título profesional
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="col-span-2 flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  id="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Profesional activo
                </label>
              </div>

              <div className="col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center mt-6">
                  <Award className="h-5 w-5 mr-2 text-gray-400" />
                  Especialidades
                </h3>
              </div>

              <div className="col-span-2">
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Selecciona las especialidades:</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SPECIALTIES.map(specialty => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => toggleSpecialty(specialty)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedSpecialties.includes(specialty)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomSpecialty()
                      }
                    }}
                    placeholder="Agregar especialidad personalizada"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addCustomSpecialty}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {selectedSpecialties.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <p className="text-sm text-gray-500 w-full">Especialidades seleccionadas:</p>
                    {selectedSpecialties.map(specialty => (
                      <span
                        key={specialty}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        {specialty}
                        <button
                          type="button"
                          onClick={() => toggleSpecialty(specialty)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biografía
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Breve descripción profesional, experiencia, formación..."
                />
              </div>

              <div className="col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center mt-6">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                  Horarios de Disponibilidad
                </h3>
              </div>

              <div className="col-span-2 space-y-3">
                {schedules.map(schedule => (
                  <div 
                    key={schedule.day_of_week}
                    className={`p-4 rounded-lg border ${
                      schedule.active 
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={schedule.active}
                          onChange={(e) => updateSchedule(schedule.day_of_week, 'active', e.target.checked)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="font-medium text-gray-900">
                          {DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label}
                        </span>
                      </div>
                      {schedule.active && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <input
                            type="time"
                            value={schedule.start_time}
                            onChange={(e) => updateSchedule(schedule.day_of_week, 'start_time', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            value={schedule.end_time}
                            onChange={(e) => updateSchedule(schedule.day_of_week, 'end_time', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
              <Link
                href={`/dashboard/professionals/${params.id}`}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}