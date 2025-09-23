"use client"

import React, { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  Filter,
  Search,
  Edit,
  Trash2,
  MapPin,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parse, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface BreatheAndMoveClass {
  id: string
  class_name: string
  instructor: string
  class_date: string
  start_time: string
  end_time: string
  max_capacity: number
  current_capacity: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  intensity: string | null
  created_at: string
  updated_at: string
  registrations?: ClassRegistration[]
}

interface ClassRegistration {
  id: string
  user_id: string
  status: 'registered' | 'waitlist' | 'cancelled'
  profiles: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    phone: string | null
  }
}


// Mapeo de colores por tipo de clase
const getClassColor = (className: string): string => {
  const colorMap: Record<string, string> = {
    'MoonRelief': '#1F2E3B',
    'WildPower': '#B8604D',
    'GutReboot': '#879794',
    'FireRush': '#5E3532',
    'BloomBeat': '#ECD0B6',
    'WindMove': '#B2B8B0',
    'ForestFire': '#3E5444',
    'StoneBarre': '#879794',
    'OmRoot': '#3E5444',
    'HazeRocket': '#61473B',
    'WindFlow': '#879794',
    'WaveMind': '#61473B'
  }
  return colorMap[className] || '#6B7280'
}

export default function BreatheAndMovePage() {
  const [classes, setClasses] = useState<BreatheAndMoveClass[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedClass, setSelectedClass] = useState<BreatheAndMoveClass | null>(null)
  const [showRegistrations, setShowRegistrations] = useState(false)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1, locale: es })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1, locale: es })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
    fetchClasses()
  }, [currentWeek])

  const fetchClasses = async () => {
    const supabase = getSupabaseBrowser()
    
    try {
      // Fetch classes for the week
      const { data: classesData, error: classesError } = await supabase
        .from('breathe_move_classes')
        .select(`
          *,
          registrations:breathe_move_enrollments(
            id,
            user_id,
            status
          )
        `)
        .gte('class_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('class_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('class_date')
        .order('start_time')

      if (classesError) throw classesError

      // Si hay clases, cargar los profiles de los usuarios registrados
      if (classesData && classesData.length > 0) {
        // Obtener todos los user_ids únicos
        const userIds = new Set<string>()
        classesData.forEach(cls => {
          if (cls.registrations) {
            cls.registrations.forEach((reg: any) => {
              if (reg.user_id) userIds.add(reg.user_id)
            })
          }
        })

        // Si hay usuarios, cargar sus profiles
        if (userIds.size > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, first_name, last_name, phone')
            .in('id', Array.from(userIds))

          if (!profilesError && profilesData) {
            // Crear un mapa de profiles
            const profilesMap = new Map(
              profilesData.map(profile => [profile.id, profile])
            )

            // Agregar los profiles a las registrations
            classesData.forEach(cls => {
              if (cls.registrations) {
                cls.registrations = cls.registrations.map((reg: any) => ({
                  ...reg,
                  profiles: profilesMap.get(reg.user_id) || null
                }))
              }
            })
          }
        }
      }

      // Agregar color basado en el nombre de la clase
      const classesWithColors = (classesData || []).map(cls => ({
        ...cls,
        color: getClassColor(cls.class_name)
      }))
      
      setClasses(classesWithColors)
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`¿Estás seguro de eliminar la clase "${className}"?\n\nEsta acción no se puede deshacer y se eliminarán todas las inscripciones asociadas.`)) return

    const supabase = getSupabaseBrowser()
    
    try {
      const { error } = await supabase
        .from('breathe_move_classes')
        .delete()
        .eq('id', classId)

      if (error) throw error

      fetchClasses()
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Error al eliminar la clase. Por favor intenta de nuevo.')
    }
  }

  const handleCancelClass = async (classId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta clase?')) return

    const supabase = getSupabaseBrowser()
    
    try {
      const { error } = await supabase
        .from('breathe_move_classes')
        .update({ status: 'cancelled' })
        .eq('id', classId)

      if (error) throw error

      fetchClasses()
    } catch (error) {
      console.error('Error cancelling class:', error)
    }
  }

  const getRegistrationCount = (classItem: BreatheAndMoveClass) => {
    if (classItem.registrations) {
      return classItem.registrations.filter(r => r.status === 'registered').length
    }
    return classItem.current_capacity || 0
  }

  const getWaitlistCount = (classItem: BreatheAndMoveClass) => {
    if (classItem.registrations) {
      return classItem.registrations.filter(r => r.status === 'waitlist').length
    }
    return 0
  }

  const getCapacityPercentage = (classItem: BreatheAndMoveClass) => {
    const registered = getRegistrationCount(classItem)
    return Math.round((registered / classItem.max_capacity) * 100)
  }

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-100'
    if (percentage >= 80) return 'text-orange-600 bg-orange-100'
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programada'
      case 'completed':
        return 'Completada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = searchTerm === '' || 
      classItem.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.instructor.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || classItem.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const getClassesForDay = (day: Date) => {
    return filteredClasses.filter(classItem => {
      // Ensure proper date parsing by adding time component
      const classDate = new Date(classItem.class_date + 'T00:00:00')
      return isSameDay(classDate, day)
    })
  }

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1))
  }

  const handleToday = () => {
    setCurrentWeek(new Date())
  }


  const isPastClass = (classDate: string, startTime: string) => {
    const classDateTime = parse(`${classDate} ${startTime}`, 'yyyy-MM-dd HH:mm:ss', new Date())
    return isAfter(new Date(), classDateTime)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando clases...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Breathe & Move</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las clases grupales y sus inscripciones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/breathe-move/nueva"
            className="flex items-center gap-2 px-6 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl font-medium"
          >
            <Plus className="h-5 w-5" />
            Nueva Clase
          </Link>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-hf-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Calendario
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-hf-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Lista
            </button>
          </div>

          {viewMode === 'calendar' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={handleNextWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700 ml-2">
                {format(weekStart, 'dd MMM', { locale: es })} - {format(weekEnd, 'dd MMM yyyy', { locale: es })}
              </span>
            </div>
          )}

          <div className="flex-1 flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar clase o instructor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hf-primary/50 focus:border-hf-primary"
              >
                <option value="all">Todos los estados</option>
                <option value="scheduled">Programadas</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'calendar' ? (
        // Calendar View
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                  isSameDay(day, new Date()) ? 'bg-hf-primary/5' : ''
                }`}
              >
                <div className="text-sm font-medium text-gray-900">
                  {format(day, 'EEEE', { locale: es })}
                </div>
                <div className={`text-lg font-semibold ${
                  isSameDay(day, new Date()) ? 'text-hf-primary' : 'text-gray-700'
                }`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {weekDays.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`min-h-[200px] p-3 border-r border-gray-200 last:border-r-0 ${
                  isSameDay(day, new Date()) ? 'bg-hf-primary/5' : ''
                }`}
              >
                <div className="space-y-2">
                  {getClassesForDay(day).map(classItem => {
                    const capacity = getCapacityPercentage(classItem)
                    const isPast = isPastClass(classItem.class_date, classItem.start_time)
                    
                    return (
                      <div
                        key={classItem.id}
                        onClick={() => {
                          setSelectedClass(classItem)
                          setShowRegistrations(true)
                        }}
                        className={`p-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                          classItem.status === 'cancelled' 
                            ? 'bg-gray-50 border-gray-300 opacity-60' 
                            : isPast
                            ? 'bg-gray-50 border-gray-300'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">
                            {classItem.start_time.slice(0, 5)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(classItem.status)}`}>
                            {getStatusText(classItem.status)}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-1">
                          {classItem.class_name}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">
                          {classItem.instructor}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className={`text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1 ${getCapacityColor(capacity)}`}>
                            <Users className="h-3 w-3" />
                            {getRegistrationCount(classItem)}/{classItem.max_capacity}
                          </div>
                          <span className="text-xs text-gray-400">{classItem.end_time.slice(0, 5)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clase
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inscritos
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClasses.map(classItem => {
                  const capacity = getCapacityPercentage(classItem)
                  const isPast = isPastClass(classItem.class_date, classItem.start_time)
                  
                  return (
                    <tr key={classItem.id} className={isPast ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{classItem.class_name}</h4>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {format(new Date(classItem.class_date), 'dd MMM yyyy', { locale: es })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {classItem.start_time.slice(0, 5)} - {classItem.end_time.slice(0, 5)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {classItem.instructor}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          <div className={`text-sm font-medium px-3 py-1 rounded-full ${getCapacityColor(capacity)}`}>
                            {getRegistrationCount(classItem)}/{classItem.max_capacity}
                          </div>
                          {getWaitlistCount(classItem) > 0 && (
                            <span className="text-xs text-gray-500 mt-1">
                              +{getWaitlistCount(classItem)} en lista
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(classItem.status)}`}>
                          {getStatusText(classItem.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedClass(classItem)
                              setShowRegistrations(true)
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Ver inscritos"
                          >
                            <Users className="h-4 w-4 text-gray-600" />
                          </button>
                          <Link
                            href={`/breathe-move/${classItem.id}/editar`}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </Link>
                          {classItem.status === 'scheduled' && !isPast && (
                            <button
                              onClick={() => handleCancelClass(classItem.id)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4 text-gray-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClass(classItem.id, classItem.class_name)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registrations Modal */}
      {showRegistrations && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedClass.class_name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(selectedClass.class_date), 'dd \'de\' MMMM, yyyy', { locale: es })} - {selectedClass.start_time.slice(0, 5)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/breathe-move/${selectedClass.id}/editar`}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Link>
                  <button
                    onClick={() => {
                      handleDeleteClass(selectedClass.id, selectedClass.class_name)
                      setShowRegistrations(false)
                      setSelectedClass(null)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                  <button
                    onClick={() => {
                      setShowRegistrations(false)
                      setSelectedClass(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Instructor:</span>
                  <span className="font-medium">{selectedClass.instructor}</span>
                </div>
                <div className="flex items-center gap-4 text-sm mt-2">
                  <span className="text-gray-500">Capacidad:</span>
                  <span className={`font-medium px-3 py-1 rounded-full ${getCapacityColor(getCapacityPercentage(selectedClass))}`}>
                    {getRegistrationCount(selectedClass)}/{selectedClass.max_capacity} inscritos
                  </span>
                  {getWaitlistCount(selectedClass) > 0 && (
                    <span className="text-gray-500">
                      +{getWaitlistCount(selectedClass)} en lista de espera
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-3">Participantes Inscritos</h3>
              
              {selectedClass.registrations && selectedClass.registrations.length > 0 ? (
                <div className="space-y-2">
                  {/* Participantes registrados */}
                  {selectedClass.registrations
                    .filter(r => r.status === 'registered')
                    .map((registration, index) => (
                      <div key={registration.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">
                              {registration.profiles?.first_name && registration.profiles?.last_name
                                ? `${registration.profiles.first_name} ${registration.profiles.last_name}`
                                : registration.profiles?.full_name || 'Sin nombre'}
                            </p>
                            {registration.profiles?.phone && (
                              <p className="text-sm text-gray-500">
                                {registration.profiles.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Inscrito
                        </span>
                      </div>
                    ))}

                  {/* Lista de espera */}
                  {selectedClass.registrations.filter(r => r.status === 'waitlist').length > 0 && (
                    <>
                      <h4 className="font-medium text-gray-700 mt-4 mb-2">Lista de Espera</h4>
                      {selectedClass.registrations
                        .filter(r => r.status === 'waitlist')
                        .map((registration, index) => (
                          <div key={registration.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-500">
                                {getRegistrationCount(selectedClass) + index + 1}.
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {registration.profiles?.first_name && registration.profiles?.last_name
                                    ? `${registration.profiles.first_name} ${registration.profiles.last_name}`
                                    : registration.profiles?.full_name || 'Sin nombre'}
                                </p>
                                {registration.profiles?.phone && (
                                  <p className="text-sm text-gray-500">
                                    {registration.profiles.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                              Lista de espera
                            </span>
                          </div>
                        ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p>No hay participantes inscritos en esta clase</p>
                  {!selectedClass.registrations && (
                    <p className="text-sm mt-2">
                      <AlertCircle className="h-4 w-4 inline-block mr-1" />
                      Para gestionar inscripciones, ejecuta el script SQL de registrations.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Intensidad</p>
                  <p className="font-medium text-gray-900">{selectedClass.intensity || 'No especificada'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Horario</p>
                  <p className="font-medium text-gray-900">
                    {selectedClass.start_time.slice(0, 5)} - {selectedClass.end_time.slice(0, 5)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}