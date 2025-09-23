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
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"

// Instructores de Breathe & Move
const breatheMoveInstructors = [
  'CLARA',
  'FERNANDA',
  'GOURA',
  'HELEN',
  'JENNY',
  'KARO',
  'KATA',
  'MANUELA',
  'MAYTECK',
  'SARA'
]

export default function EditarClasePage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
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
        const classDate = new Date(data.class_date + 'T00:00:00')
        setSelectedDate(classDate)
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


  // Generar opciones de tiempo
  const TIME_OPTIONS = []
  for (let hour = 6; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      TIME_OPTIONS.push(time)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = getSupabaseBrowser()
    
    try {
      // Verificar conflictos antes de actualizar
      const startTime = formData.start_time + ':00'
      const endTime = formData.end_time + ':00'
      
      // Verificar conflictos de horario (excluyendo la clase actual)
      const { data: conflictingClasses, error: conflictError } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .eq('class_date', formData.class_date)
        .eq('status', 'scheduled')
        .neq('id', classId)
      
      if (conflictError) throw conflictError
      
      if (conflictingClasses && conflictingClasses.length > 0) {
        const hasConflict = conflictingClasses.some(existingClass => {
          const existingStart = existingClass.start_time
          const existingEnd = existingClass.end_time
          
          return (startTime < existingEnd && endTime > existingStart)
        })
        
        if (hasConflict) {
          alert('Ya existe una clase programada en ese horario. Recuerda que solo hay un salón disponible.')
          setSaving(false)
          return
        }
      }
      
      // Verificar conflictos del instructor (excluyendo la clase actual)
      const { data: instructorClasses, error: instructorError } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .eq('instructor', formData.instructor)
        .eq('class_date', formData.class_date)
        .eq('status', 'scheduled')
        .neq('id', classId)
      
      if (instructorError) throw instructorError
      
      if (instructorClasses && instructorClasses.length > 0) {
        const hasInstructorConflict = instructorClasses.some(existingClass => {
          const existingStart = existingClass.start_time
          const existingEnd = existingClass.end_time
          
          return (startTime < existingEnd && endTime > existingStart)
        })
        
        if (hasInstructorConflict) {
          alert(`El instructor ${formData.instructor} ya tiene una clase programada en ese horario.`)
          setSaving(false)
          return
        }
      }
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

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'start_time') {
      // Calculate duration from existing end_time
      const [startHours, startMinutes] = value.split(':').map(Number)
      const [endHours, endMinutes] = formData.end_time.split(':').map(Number)
      
      const startDate = new Date()
      startDate.setHours(startHours, startMinutes, 0, 0)
      const endDate = new Date()
      endDate.setHours(endHours, endMinutes, 0, 0)
      
      const durationMs = endDate.getTime() - startDate.getTime()
      const durationMinutes = Math.round(durationMs / 60000)
      
      // Update end time based on duration
      const newEndTime = calculateEndTime(value, durationMinutes > 0 ? durationMinutes : 60)
      
      setFormData(prev => ({
        ...prev,
        start_time: value,
        end_time: newEndTime
      }))
    } else if (name === 'max_capacity') {
      const numValue = parseInt(value)
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 50) {
        setFormData(prev => ({
          ...prev,
          [name]: numValue
        }))
      } else if (value === '') {
        setFormData(prev => ({
          ...prev,
          [name]: '' as any
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
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
            <select
              name="instructor"
              value={formData.instructor}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            >
              <option value="">Selecciona un instructor</option>
              {breatheMoveInstructors.map(instructor => (
                <option key={instructor} value={instructor}>
                  {instructor}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline-block mr-1" />
              Fecha de la clase
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => {
                if (date) {
                  setSelectedDate(date)
                  setFormData(prev => ({
                    ...prev,
                    class_date: format(date, 'yyyy-MM-dd')
                  }))
                }
              }}
              dateFormat="dd/MM/yyyy"
              locale={es}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              placeholderText="Selecciona una fecha"
              required
              popperPlacement="bottom-start"
              showPopperArrow={false}
              customInput={
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary cursor-pointer"
                />
              }
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
            <select
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            >
              {TIME_OPTIONS.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {/* Hora fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline-block mr-1" />
              Hora de finalización
            </label>
            <select
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            >
              {TIME_OPTIONS.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
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
              onChange={(e) => {
                const value = e.target.value
                if (value === '') {
                  setFormData(prev => ({ ...prev, max_capacity: '' as any }))
                } else {
                  const numValue = parseInt(value)
                  if (!isNaN(numValue) && numValue >= 1 && numValue <= 50) {
                    setFormData(prev => ({ ...prev, max_capacity: numValue }))
                  }
                }
              }}
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
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg font-medium disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
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