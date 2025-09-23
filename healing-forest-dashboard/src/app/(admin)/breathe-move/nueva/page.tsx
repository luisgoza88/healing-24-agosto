"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  User,
  AlertCircle,
  Save,
  Activity,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"

export default function NewBreatheAndMoveClassPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityMessage, setAvailabilityMessage] = useState('')

  // Classes predefinidas - Nombres reales de Healing Forest
  const classTypes = [
    { value: 'BloomBeat', label: 'BloomBeat' },
    { value: 'FireRush', label: 'FireRush' },
    { value: 'ForestFire', label: 'ForestFire' },
    { value: 'GutReboot', label: 'GutReboot' },
    { value: 'HazeRocket', label: 'HazeRocket' },
    { value: 'MoonRelief', label: 'MoonRelief' },
    { value: 'OmRoot', label: 'OmRoot' },
    { value: 'StoneBarre', label: 'StoneBarre' },
    { value: 'WaveMind', label: 'WaveMind' },
    { value: 'WildPower', label: 'WildPower' },
    { value: 'WindFlow', label: 'WindFlow' },
    { value: 'WindMove', label: 'WindMove' },
    { value: 'Yoga', label: 'Yoga' }
  ]
  
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

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`
  }
  
  // Form state
  const [formData, setFormData] = useState({
    classType: '',
    instructor: '',
    class_date: format(new Date(), 'yyyy-MM-dd'),
    class_time: '08:00',
    duration_minutes: 60,
    max_capacity: 20,
    intensity: 'media',
    status: 'scheduled'
  })
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_minutes' ? parseInt(value) || 60 : 
              name === 'max_capacity' ? (value === '' ? '' : parseInt(value) || '') : 
              value
    }))
  }

  const getClassName = () => {
    const classType = classTypes.find(c => c.value === formData.classType)
    return classType ? classType.label : ''
  }

  // Verificar disponibilidad cuando cambian fecha, hora o duración
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.class_date || !formData.class_time) return
      
      setCheckingAvailability(true)
      setAvailabilityMessage('')
      
      const supabase = getSupabaseBrowser()
      const startTime = `${formData.class_time}:00`
      const endTime = calculateEndTime(formData.class_time, formData.duration_minutes)
      
      try {
        const { data: existingClasses, error } = await supabase
          .from('breathe_move_classes')
          .select('*')
          .eq('class_date', formData.class_date)
          .eq('status', 'scheduled')
          .order('start_time')
        
        if (error) throw error
        
        if (existingClasses && existingClasses.length > 0) {
          // Verificar conflictos
          const conflicts = existingClasses.filter(existingClass => {
            const existingStart = existingClass.start_time
            const existingEnd = existingClass.end_time
            return (startTime < existingEnd && endTime > existingStart)
          })
          
          if (conflicts.length > 0) {
            const conflictMessages = conflicts.map(c => 
              `${c.class_name} con ${c.instructor} (${c.start_time.slice(0, 5)} - ${c.end_time.slice(0, 5)})`
            ).join(', ')
            setAvailabilityMessage(`⚠️ Conflicto con: ${conflictMessages}`)
          } else {
            setAvailabilityMessage('✅ Horario disponible')
          }
        } else {
          setAvailabilityMessage('✅ Horario disponible')
        }
      } catch (error) {
        console.error('Error checking availability:', error)
      } finally {
        setCheckingAvailability(false)
      }
    }
    
    const timer = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timer)
  }, [formData.class_date, formData.class_time, formData.duration_minutes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validaciones
    if (!formData.classType) {
      setError('Por favor selecciona un tipo de clase')
      setLoading(false)
      return
    }

    if (!formData.instructor) {
      setError('Por favor selecciona un instructor')
      setLoading(false)
      return
    }

    const supabase = getSupabaseBrowser()

    try {
      // Primero verificamos conflictos
      const startTime = `${formData.class_time}:00`
      const endTime = calculateEndTime(formData.class_time, formData.duration_minutes)
      
      // Verificar conflictos de horario (solo hay un salón)
      const { data: conflictingClasses, error: conflictError } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .eq('class_date', formData.class_date)
        .eq('status', 'scheduled')
        .or(`start_time.lte.${endTime},end_time.gte.${startTime}`)
      
      if (conflictError) throw conflictError
      
      if (conflictingClasses && conflictingClasses.length > 0) {
        // Verificar si hay conflicto real de horario
        const hasConflict = conflictingClasses.some(existingClass => {
          const existingStart = existingClass.start_time
          const existingEnd = existingClass.end_time
          
          // Verificar superposición de horarios
          return (startTime < existingEnd && endTime > existingStart)
        })
        
        if (hasConflict) {
          setError('Ya existe una clase programada en ese horario. Recuerda que solo hay un salón disponible.')
          setLoading(false)
          return
        }
      }
      
      // Verificar conflictos del instructor
      const { data: instructorClasses, error: instructorError } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .eq('instructor', formData.instructor)
        .eq('class_date', formData.class_date)
        .eq('status', 'scheduled')
      
      if (instructorError) throw instructorError
      
      if (instructorClasses && instructorClasses.length > 0) {
        const hasInstructorConflict = instructorClasses.some(existingClass => {
          const existingStart = existingClass.start_time
          const existingEnd = existingClass.end_time
          
          return (startTime < existingEnd && endTime > existingStart)
        })
        
        if (hasInstructorConflict) {
          setError(`El instructor ${formData.instructor} ya tiene una clase programada en ese horario.`)
          setLoading(false)
          return
        }
      }
      const dataToInsert = {
        class_name: getClassName(),
        instructor: formData.instructor,
        class_date: formData.class_date,
        start_time: `${formData.class_time}:00`,
        end_time: calculateEndTime(formData.class_time, formData.duration_minutes),
        max_capacity: formData.max_capacity,
        current_capacity: 0,
        intensity: formData.intensity,
        status: formData.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      }
      
      console.log('Guardando clase:', dataToInsert)
      
      const { error: classError, data } = await supabase
        .from('breathe_move_classes')
        .insert(dataToInsert)
        .select()

      if (classError) {
        console.error('Error de Supabase:', classError)
        throw classError
      }
      
      console.log('Clase guardada exitosamente:', data)

      setSuccess(true)
      setTimeout(() => {
        router.push('/breathe-move')
      }, 1500)
    } catch (error) {
      console.error('Error creating class:', error)
      setError('Error al crear la clase. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const TIME_OPTIONS = []
  for (let hour = 6; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      TIME_OPTIONS.push(time)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/breathe-move"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva Clase de Breathe & Move</h1>
          <p className="text-sm text-gray-500 mt-1">
            Programa una nueva sesión grupal
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">¡Clase creada exitosamente! Redirigiendo...</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Tipo de Clase */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Clase *
            </label>
            <select
              name="classType"
              value={formData.classType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
            >
              <option value="">Selecciona el tipo de clase</option>
              {classTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>


          {/* Instructor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                Instructor *
              </div>
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

          {/* Availability Message */}
          {availabilityMessage && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              availabilityMessage.includes('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {checkingAvailability ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Verificando disponibilidad...
                </div>
              ) : (
                availabilityMessage
              )}
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Fecha *
                </div>
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
                minDate={new Date()}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Hora *
                </div>
              </label>
              <select
                name="class_time"
                value={formData.class_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración (min) *
              </label>
              <select
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              >
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos</option>
                <option value="75">75 minutos</option>
                <option value="90">90 minutos</option>
                <option value="120">120 minutos</option>
              </select>
            </div>
          </div>

          {/* Capacity and Intensity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Capacidad Máxima *
                </div>
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
                min="1"
                max="50"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número máximo de participantes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-400" />
                  Intensidad
                </div>
              </label>
              <select
                name="intensity"
                value={formData.intensity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-900 mb-3">Resumen de la Clase</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">Clase:</span>
              <span className="font-medium">
                {getClassName() || 'Por definir'}
              </span>
              
              <span className="text-gray-500">Fecha:</span>
              <span className="font-medium">
                {format(new Date(formData.class_date + 'T00:00:00'), 'EEEE d \'de\' MMMM, yyyy', { locale: es })}
              </span>
              
              <span className="text-gray-500">Horario:</span>
              <span className="font-medium">
                {formData.class_time} - {formData.duration_minutes} minutos
              </span>
              
              <span className="text-gray-500">Capacidad:</span>
              <span className="font-medium">{formData.max_capacity} participantes</span>
              
              <span className="text-gray-500">Instructor:</span>
              <span className="font-medium">{formData.instructor || 'Por definir'}</span>

              <span className="text-gray-500">Intensidad:</span>
              <span className="font-medium capitalize">{formData.intensity}</span>
            </div>
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
            disabled={loading || success}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
              loading || success
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Guardar Clase
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}