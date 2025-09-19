'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Users, User } from 'lucide-react'
import { createClient, useSupabase } from '@/lib/supabase'

interface BreatheClass {
  id?: string
  class_name: string
  instructor: string
  class_date: string
  start_time: string
  end_time: string
  max_capacity: number
  current_capacity?: number
  intensity?: string
  status?: string
}

interface ClassModalProps {
  isOpen: boolean
  onClose: () => void
  editingClass: BreatheClass | null
}

const CLASS_TYPES = [
  'WildPower',
  'BloomBeat', 
  'MoonRelief',
  'FireRush',
  'GutReboot',
  'OmRoot',
  'ForestFire',
  'HazeRocket',
  'WindFlow'
]

const INSTRUCTORS = [
  'María García',
  'Ana Martínez',
  'Carolina López',
  'Sofía Rodríguez',
  'Valentina Gómez'
]

export default function BreatheMoveClassModal({ isOpen, onClose, editingClass }: ClassModalProps) {
  const [formData, setFormData] = useState<BreatheClass>({
    class_name: '',
    instructor: '',
    class_date: '',
    start_time: '',
    end_time: '',
    max_capacity: 12,
    intensity: 'medium',
    status: 'scheduled'
  })
  const [loading, setLoading] = useState(false)
  const supabase = useSupabase()

  useEffect(() => {
    if (editingClass) {
      setFormData({
        ...editingClass,
        class_date: editingClass.class_date,
        start_time: editingClass.start_time.slice(0, 5),
        end_time: editingClass.end_time.slice(0, 5)
      })
    } else {
      // Para nueva clase, establecer fecha de mañana por defecto
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
      setFormData({
        class_name: '',
        instructor: '',
        class_date: tomorrowStr,
        start_time: '07:00',
        end_time: '07:50',
        max_capacity: 12,
        intensity: 'medium',
        status: 'scheduled'
      })
    }
  }, [editingClass])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Formatear los tiempos con segundos
      const dataToSave = {
        ...formData,
        start_time: `${formData.start_time}:00`,
        end_time: `${formData.end_time}:00`,
        current_capacity: editingClass?.current_capacity || 0
      }

      if (editingClass?.id) {
        // Actualizar clase existente
        const { error } = await supabase
          .from('breathe_move_classes')
          .update(dataToSave)
          .eq('id', editingClass.id)

        if (error) throw error
      } else {
        // Crear nueva clase
        const { error } = await supabase
          .from('breathe_move_classes')
          .insert([dataToSave])

        if (error) throw error
      }

      onClose()
    } catch (error) {
      console.error('Error saving class:', error)
      alert('Error al guardar la clase')
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicateWeek = async () => {
    if (!confirm('¿Quieres duplicar esta clase para toda la semana?')) return
    
    setLoading(true)
    try {
      // Parsear la fecha base correctamente
      const [year, month, day] = formData.class_date.split('-').map(Number)
      const baseDate = new Date(year, month - 1, day)
      const promises = []
      
      // Duplicar para los próximos 6 días
      for (let i = 1; i <= 6; i++) {
        const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
        newDate.setDate(newDate.getDate() + i)
        
        const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`
        
        const newClass = {
          ...formData,
          class_date: dateStr,
          start_time: `${formData.start_time}:00`,
          end_time: `${formData.end_time}:00`,
          current_capacity: 0
        }
        
        promises.push(
          supabase.from('breathe_move_classes').insert([newClass])
        )
      }
      
      await Promise.all(promises)
      onClose()
    } catch (error) {
      console.error('Error duplicating classes:', error)
      alert('Error al duplicar las clases')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingClass ? 'Editar Clase' : 'Nueva Clase'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Clase
            </label>
            <select
              value={formData.class_name}
              onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar clase</option>
              {CLASS_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructor
            </label>
            <select
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar instructor</option>
              {INSTRUCTORS.map(instructor => (
                <option key={instructor} value={instructor}>{instructor}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={formData.class_date}
              onChange={(e) => setFormData({ ...formData, class_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora Inicio
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora Fin
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidad Máxima
            </label>
            <input
              type="number"
              value={formData.max_capacity || ''}
              onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 12 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              min="1"
              max="20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intensidad
            </label>
            <select
              value={formData.intensity || 'medium'}
              onChange={(e) => setFormData({ ...formData, intensity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : (editingClass ? 'Actualizar' : 'Crear Clase')}
            </button>
            {!editingClass && (
              <button
                type="button"
                onClick={handleDuplicateWeek}
                disabled={loading || !formData.class_name || !formData.instructor}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Duplicar Semana
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}