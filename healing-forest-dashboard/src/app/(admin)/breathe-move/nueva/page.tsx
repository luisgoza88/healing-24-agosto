"use client"

import React, { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MapPin,
  User,
  AlertCircle,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function NewBreatheAndMoveClassPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`
  }
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor_name: '',
    class_date: format(new Date(), 'yyyy-MM-dd'),
    class_time: '08:00',
    duration_minutes: 60,
    max_capacity: 20,
    location: '',
    status: 'scheduled'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_minutes' || name === 'max_capacity' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = getSupabaseBrowser()

    try {
      const { error: classError } = await supabase
        .from('breathe_move_classes')
        .insert({
          class_name: formData.title,
          instructor: formData.instructor_name,
          class_date: formData.class_date,
          start_time: `${formData.class_time}:00`,
          end_time: calculateEndTime(formData.class_time, formData.duration_minutes),
          max_capacity: formData.max_capacity,
          current_capacity: 0,
          intensity: 'media',
          status: formData.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
        })

      if (classError) throw classError

      router.push('/breathe-move')
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Clase *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              placeholder="Ej: Breathe & Move - Nivel Principiante"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              placeholder="Describe los objetivos y actividades de la clase..."
            />
          </div>

          {/* Instructor */}
          <div>
            <label htmlFor="instructor_name" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                Instructor *
              </div>
            </label>
            <input
              type="text"
              id="instructor_name"
              name="instructor_name"
              value={formData.instructor_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              placeholder="Nombre del instructor"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="class_date" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Fecha *
                </div>
              </label>
              <input
                type="date"
                id="class_date"
                name="class_date"
                value={formData.class_date}
                onChange={handleChange}
                min={format(new Date(), 'yyyy-MM-dd')}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            </div>

            <div>
              <label htmlFor="class_time" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Hora *
                </div>
              </label>
              <select
                id="class_time"
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
              <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                Duración (min) *
              </label>
              <select
                id="duration_minutes"
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

          {/* Capacity and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="max_capacity" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Capacidad Máxima *
                </div>
              </label>
              <input
                type="number"
                id="max_capacity"
                name="max_capacity"
                value={formData.max_capacity}
                onChange={handleChange}
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
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  Ubicación
                </div>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
                placeholder="Ej: Salón Principal, Área de Yoga"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-900 mb-3">Resumen de la Clase</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
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
              <span className="font-medium">{formData.instructor_name || 'Por definir'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Link
            href="/breathe-move"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-lg transition-colors ${
              loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-hf-primary text-white hover:bg-hf-primary/90'
            }`}
          >
            {loading ? 'Creando...' : 'Crear Clase'}
          </button>
        </div>
      </form>
    </div>
  )
}