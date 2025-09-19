'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit, Trash2, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient, useSupabase } from '@/lib/supabase'
import { formatDateString } from '@/src/lib/dateUtils'
import ClassModal from '@/components/BreatheMoveClassModal'

interface BreatheClass {
  id: string
  class_name: string
  instructor: string
  class_date: string
  start_time: string
  end_time: string
  max_capacity: number
  current_capacity: number
  status: string
  intensity?: string
}

export default function BreatheMoveCalendarPage() {
  const [classes, setClasses] = useState<BreatheClass[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editingClass, setEditingClass] = useState<BreatheClass | null>(null)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const supabase = useSupabase()

  // Cargar clases
  useEffect(() => {
    fetchClasses()
  }, [selectedDate, viewMode])

  const fetchClasses = async () => {
    setLoading(true)
    try {
      let startDate: Date
      let endDate: Date

      if (viewMode === 'week') {
        // Obtener inicio y fin de la semana usando fechas locales (comenzando en lunes)
        const weekStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
        const dayOfWeek = selectedDate.getDay()
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        weekStart.setDate(weekStart.getDate() + daysToMonday)
        
        const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
        weekEnd.setDate(weekEnd.getDate() + 6)
        
        // Formatear como strings YYYY-MM-DD para evitar problemas de zona horaria
        const startStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
        const endStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`
        
        startDate = weekStart
        endDate = weekEnd
      } else {
        // Obtener inicio y fin del mes
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      }

      // Usar strings de fecha para evitar conversiones de zona horaria
      const startStr = viewMode === 'week' 
        ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
        : startDate.toISOString().split('T')[0]
      const endStr = viewMode === 'week'
        ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        : endDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .gte('class_date', startStr)
        .lte('class_date', endStr)
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClass = () => {
    setEditingClass(null)
    setShowModal(true)
  }

  const handleEditClass = (cls: BreatheClass) => {
    setEditingClass(cls)
    setShowModal(true)
  }

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta clase?')) return

    try {
      const { error } = await supabase
        .from('breathe_move_classes')
        .delete()
        .eq('id', classId)

      if (error) throw error
      
      fetchClasses()
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Error al eliminar la clase')
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingClass(null)
    fetchClasses()
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    if (viewMode === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setSelectedDate(newDate)
  }

  const getWeekDays = () => {
    // Usar fecha local para evitar problemas de zona horaria
    const weekStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    // Ajustar para que la semana comience en lunes
    const dayOfWeek = selectedDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    weekStart.setDate(weekStart.getDate() + daysToMonday)
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
      day.setDate(weekStart.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getClassesForDay = (date: Date) => {
    // Formatear fecha localmente para evitar cambios de zona horaria
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return classes.filter(cls => cls.class_date === dateStr)
  }

  const getClassColor = (className: string) => {
    const colors: { [key: string]: string } = {
      'WildPower': 'bg-orange-100 text-orange-800 border-orange-200',
      'BloomBeat': 'bg-pink-100 text-pink-800 border-pink-200',
      'MoonRelief': 'bg-purple-100 text-purple-800 border-purple-200',
      'FireRush': 'bg-red-100 text-red-800 border-red-200',
      'GutReboot': 'bg-green-100 text-green-800 border-green-200',
      'OmRoot': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'ForestFire': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'HazeRocket': 'bg-blue-100 text-blue-800 border-blue-200',
      'WindFlow': 'bg-teal-100 text-teal-800 border-teal-200',
    }
    return colors[className] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario Breathe & Move</h1>
          <p className="text-sm text-gray-600 mt-1">Gestiona los horarios de las clases</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Vista {viewMode === 'week' ? 'Mensual' : 'Semanal'}
          </button>
          <button
            onClick={handleAddClass}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nueva Clase
          </button>
        </div>
      </div>

      {/* Navegación de fecha */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {viewMode === 'week' 
              ? `Semana del ${formatDateString(`${getWeekDays()[0].getFullYear()}-${String(getWeekDays()[0].getMonth() + 1).padStart(2, '0')}-${String(getWeekDays()[0].getDate()).padStart(2, '0')}`)}`
              : selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            }
          </h2>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-600">Cargando clases...</span>
            </div>
          </div>
        ) : viewMode === 'week' ? (
          <div className="grid grid-cols-7 divide-x divide-gray-200">
            {getWeekDays().map((day, index) => (
              <div key={index} className="min-h-[400px]">
                <div className="bg-gray-50 p-3 text-center border-b">
                  <div className="font-medium text-sm text-gray-900">
                    {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                  </div>
                  <div className={`text-2xl ${
                    day.toDateString() === new Date().toDateString() 
                      ? 'font-bold text-green-600' 
                      : 'text-gray-700'
                  }`}>
                    {day.getDate()}
                  </div>
                </div>
                <div className="p-2 space-y-2">
                  {getClassesForDay(day).map(cls => (
                    <div
                      key={cls.id}
                      className={`p-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getClassColor(cls.class_name)}`}
                      onClick={() => handleEditClass(cls)}
                    >
                      <div className="font-semibold text-xs">{cls.class_name}</div>
                      <div className="text-xs flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {cls.start_time.slice(0, 5)}
                      </div>
                      <div className="text-xs">{cls.instructor}</div>
                      <div className="text-xs flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        {cls.current_capacity}/{cls.max_capacity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Vista mensual
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-gray-700 pb-2">
                  {day}
                </div>
              ))}
              {/* Aquí iría la implementación de la vista mensual */}
            </div>
          </div>
        )}
      </div>

      {/* Modal para agregar/editar clase */}
      {showModal && (
        <ClassModal
          isOpen={showModal}
          onClose={handleModalClose}
          editingClass={editingClass}
        />
      )}
    </div>
  )
}