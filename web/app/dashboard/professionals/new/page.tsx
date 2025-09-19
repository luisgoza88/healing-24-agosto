'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, useSupabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Phone, 
  Award,
  FileText,
  Plus,
  X
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

export default function NewProfessionalPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    title: '',
    phone: '',
    bio: '',
    active: true
  })
  const router = useRouter()
  const supabase = useSupabase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Crear usuario en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'professional'
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Crear perfil del profesional
        const professionalData = {
          id: crypto.randomUUID(),
          user_id: authData.user.id,
          full_name: formData.full_name,
          title: formData.title || null,
          specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
          email: formData.email,
          phone: formData.phone || null,
          bio: formData.bio || null,
          active: formData.active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: professionalError } = await supabase
          .from('professionals')
          .insert([professionalData])

        if (professionalError) throw professionalError

        // Crear perfil básico en profiles
        const profileData = {
          id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData])

        if (profileError) console.error('Error creating profile:', profileError)

        // Asignar rol de profesional
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authData.user.id,
            role: 'professional'
          }])

        if (roleError) console.error('Error assigning role:', roleError)

        router.push(`/dashboard/professionals/${professionalData.id}`)
      }
    } catch (error: any) {
      console.error('Error creating professional:', error)
      setError(error.message || 'Error al crear el profesional')
    } finally {
      setLoading(false)
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/dashboard/professionals"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver a profesionales
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Profesional</h1>
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
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  Información de Cuenta
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="doctor@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña temporal <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>

              <div className="col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center mt-6">
                  <FileText className="h-5 w-5 mr-2 text-gray-400" />
                  Información Profesional
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Dr. Juan Pérez"
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
                  placeholder="Médico Cirujano"
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
                  placeholder="(123) 456-7890"
                />
              </div>

              <div className="flex items-center">
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
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
              <Link
                href="/dashboard/professionals"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Guardando...' : 'Guardar Profesional'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}