'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, Clock, Users, MapPin, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format, parseISO, addDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

interface BreatheMoveClass {
  id: string
  name: string
  description: string
  instructor_name: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  capacity: number
  enrolled_count: number
  location: string
  price: number
  class_type: string
  level: string
  image_url?: string
}

const classTypes = [
  { value: 'all', label: 'Todas las clases' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'breathwork', label: 'Breathwork' },
  { value: 'meditation', label: 'Meditación' },
  { value: 'sound_healing', label: 'Sound Healing' },
]

const levels = [
  { value: 'all', label: 'Todos los niveles' },
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
]

export default function ClassesPage() {
  const [classes, setClasses] = useState<BreatheMoveClass[]>([])
  const [filteredClasses, setFilteredClasses] = useState<BreatheMoveClass[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    filterClasses()
  }, [classes, searchTerm, selectedType, selectedLevel, selectedDate])

  const fetchClasses = async () => {
    try {
      const startDate = new Date()
      const endDate = addDays(startDate, 30)

      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error

      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterClasses = () => {
    let filtered = [...classes]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.instructor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((c) => c.class_type === selectedType)
    }

    // Level filter
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((c) => c.level === selectedLevel)
    }

    // Date filter
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      filtered = filtered.filter((c) => c.date === dateStr)
    }

    setFilteredClasses(filtered)
  }

  const getAvailableSpots = (capacity: number, enrolled: number) => {
    const available = capacity - enrolled
    if (available <= 0) return 'Clase llena'
    if (available <= 3) return `${available} cupos disponibles`
    return `${available} cupos disponibles`
  }

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getClassTypeIcon = (type: string) => {
    switch (type) {
      case 'yoga':
        return '🧘‍♀️'
      case 'pilates':
        return '🤸‍♀️'
      case 'breathwork':
        return '🌬️'
      case 'meditation':
        return '🧘'
      case 'sound_healing':
        return '🔔'
      default:
        return '✨'
    }
  }

  // Generate week dates for quick selection
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(new Date(), { locale: es }), i)
    return {
      date,
      day: format(date, 'EEE', { locale: es }),
      dayNumber: format(date, 'd'),
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Clases Disponibles</h1>
          <p className="mt-2 text-lg text-gray-600">
            Encuentra la clase perfecta para tu bienestar
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por clase, instructor..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            <Filter className="h-5 w-5" />
            Filtros
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg bg-white p-4 shadow-sm lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de clase
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {classTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nivel
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                {levels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha específica
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
              />
            </div>
          </div>
        )}

        {/* Quick Date Selection */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {weekDates.map((weekDate) => (
            <button
              key={weekDate.date.toISOString()}
              onClick={() => setSelectedDate(weekDate.date)}
              className={`flex flex-col items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(weekDate.date, 'yyyy-MM-dd')
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xs">{weekDate.day}</span>
              <span className="text-lg">{weekDate.dayNumber}</span>
            </button>
          ))}
          <button
            onClick={() => setSelectedDate(null)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !selectedDate ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Cargando clases...</p>
            </div>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No se encontraron clases con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((classItem) => {
              const availableSpots = classItem.capacity - classItem.enrolled_count
              const isFull = availableSpots <= 0

              return (
                <div
                  key={classItem.id}
                  className="group relative rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* Class Type Icon */}
                  <div className="absolute -top-3 left-4 text-2xl">
                    {getClassTypeIcon(classItem.class_type)}
                  </div>

                  <div className="p-6 pt-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                          {classItem.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          con {classItem.instructor_name}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getLevelBadgeColor(classItem.level)}`}>
                        {classItem.level === 'beginner' && 'Principiante'}
                        {classItem.level === 'intermediate' && 'Intermedio'}
                        {classItem.level === 'advanced' && 'Avanzado'}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {classItem.description}
                    </p>

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                        {format(parseISO(classItem.date), "EEEE d 'de' MMMM", { locale: es })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="mr-2 h-4 w-4 text-gray-400" />
                        {classItem.start_time.slice(0, 5)} - {classItem.end_time.slice(0, 5)} ({classItem.duration_minutes} min)
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                        {classItem.location}
                      </div>
                      <div className="flex items-center text-sm">
                        <Users className="mr-2 h-4 w-4 text-gray-400" />
                        <span className={isFull ? 'text-red-600' : 'text-green-600'}>
                          {getAvailableSpots(classItem.capacity, classItem.enrolled_count)}
                        </span>
                      </div>
                    </div>

                    {/* Price and Action */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-lg font-semibold text-gray-900">
                        ${classItem.price.toLocaleString('es-CO')}
                      </span>
                      <Link
                        href={`/classes/${classItem.id}`}
                        className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          isFull
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isFull ? 'Clase llena' : 'Ver detalles'}
                        {!isFull && <ChevronRight className="ml-1 h-4 w-4" />}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}