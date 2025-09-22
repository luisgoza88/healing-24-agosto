"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { 
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  Users,
  Activity,
  User,
  Loader2
} from 'lucide-react'
import { format, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

export default function EditarClasePage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [professionals, setProfessionals] = useState<any[]>([])
  const [formData, setFormData] = useState({
    class_name: '',
    instructor: '',
    class_date: '',
    start_time: '',
    end_time: '',
    max_capacity: 20,
    current_capacity: 0,
    intensity: '',
    status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  })

  useEffect(() => {
    fetchClassData()
    fetchProfessionals()
  }, [classId])

  const fetchClassData = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          class_name: data.class_name,
          instructor: data.instructor,
          class_date: data.class_date,
          start_time: data.start_time.slice(0, 5),
          end_time: data.end_time.slice(0, 5),
          max_capacity: data.max_capacity,
          current_capacity: data.current_capacity,
          intensity: data.intensity || '',
          status: data.status
        })
      }
    } catch (error) {
      console.error('Error fetching class:', error)
      alert('Error al cargar la clase')
      router.push('/breathe-move')
    } finally {
      setLoading(false)
    }
  }

  const fetchProfessionals = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, full_name')
        .eq('active', true)
        .order('full_name')

      if (error) throw error

      setProfessionals(data || [])
    } catch (error) {
      console.error('Error fetching professionals:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = getSupabaseBrowser()
    
    try {
      const { error } = await supabase
        .from('breathe_move_classes')
        .update({
          ...formData,
          start_time: formData.start_time + ':00',
          end_time: formData.end_time + ':00'
        })
        .eq('id', classId)

      if (error) throw error

      router.push('/breathe-move')
    } catch (error) {
      console.error('Error updating class:', error)
      alert('Error al actualizar la clase. Por favor intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-hf-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/breathe-move"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Editar Clase</h1>
          <p className="text-sm text-gray-500 mt-1">
            Actualiza la información de la clase
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nombre de la clase */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la clase
            </label>
            <input
              type="text"
              name="class_name"
              value={formData.class_name}
              onChange={handleChange}
              required
              placeholder="Ej: Yoga Matutino"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            />
          </div>

          {/* Instructor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline-block mr-1" />
              Instructor
            </label>
            {professionals.length > 0 ? (
              <select
                name="instructor"
                value={formData.instructor}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              >
                <option value="">Selecciona un instructor</option>
                {professionals.map(prof => (
                  <option key={prof.id} value={prof.full_name}>
                    {prof.full_name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="instructor"
                value={formData.instructor}
                onChange={handleChange}
                required
                placeholder="Nombre del instructor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline-block mr-1" />
              Fecha de la clase
            </label>
            <input
              type="date"
              name="class_date"
              value={formData.class_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            />
          </div>

          {/* Intensidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Activity className="h-4 w-4 inline-block mr-1" />
              Intensidad
            </label>
            <select
              name="intensity"
              value={formData.intensity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            >
              <option value="">No especificada</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          {/* Hora inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline-block mr-1" />
              Hora de inicio
            </label>
            <input
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            />
          </div>

          {/* Hora fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline-block mr-1" />
              Hora de finalización
            </label>
            <input
              type="time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            />
          </div>

          {/* Capacidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 inline-block mr-1" />
              Capacidad máxima
            </label>
            <input
              type="number"
              name="max_capacity"
              value={formData.max_capacity}
              onChange={handleChange}
              required
              min="1"
              max="50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Inscritos actualmente: {formData.current_capacity}
            </p>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            >
              <option value="scheduled">Programada</option>
              <option value="in_progress">En progreso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <Link
            href="/breathe-move"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-white bg-hf-primary rounded-lg hover:bg-hf-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}