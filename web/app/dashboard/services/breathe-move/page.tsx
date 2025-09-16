"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Users, MapPin, ChevronLeft, ChevronRight, RefreshCw, Eye, Edit, Trash2, X, Plus, Loader2 } from "lucide-react";
import { seedSeptember2025 } from "@/src/utils/seedBreatheMoveClassesWeb";
import Link from "next/link";
import { 
  useBreatheMoveClasses, 
  useDeleteClass, 
  useUpdateClass,
  usePrefetchNextMonth,
  type BreatheMoveClass 
} from "@/src/hooks/useBreatheMoveClasses";
import EditClassModal from "@/components/EditClassModal";

const classColors: { [key: string]: string } = {
  'WildPower': 'bg-orange-500',
  'GutReboot': 'bg-gray-500',
  'FireRush': 'bg-red-600',
  'BloomBeat': 'bg-pink-400',
  'WindMove': 'bg-green-400',
  'ForestFire': 'bg-emerald-600',
  'StoneBarre': 'bg-gray-600',
  'OmRoot': 'bg-green-700',
  'HazeRocket': 'bg-amber-700',
  'MoonRelief': 'bg-blue-900',
  'WindFlow': 'bg-gray-400',
  'WaveMind': 'bg-amber-600'
};

export default function BreatheMovePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingClass, setEditingClass] = useState<BreatheMoveClass | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // React Query hooks
  const { data: classes = [], isLoading, refetch } = useBreatheMoveClasses(currentMonth);
  const deleteClass = useDeleteClass();
  const updateClass = useUpdateClass();
  const prefetchNextMonth = usePrefetchNextMonth(currentMonth);

  // Prefetch próximo mes cuando cambie el mes actual
  useEffect(() => {
    prefetchNextMonth();
  }, [currentMonth, prefetchNextMonth]);

  const today = new Date();
  const next7Days = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(today, i)), 
    []
  );

  // Optimizar cálculo de días del mes con memo
  const monthDays = useMemo(() => 
    eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    }),
    [currentMonth]
  );

  // Memoizar clases por fecha para evitar recálculos
  const classesByDate = useMemo(() => {
    const map = new Map<string, BreatheMoveClass[]>();
    classes.forEach(cls => {
      const date = cls.class_date;
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(cls);
    });
    return map;
  }, [classes]);

  const getClassesForDate = (date: Date): BreatheMoveClass[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return classesByDate.get(dateStr) || [];
  };

  const getDayClasses = (date: Date) => {
    const dayClasses = getClassesForDate(date);
    return dayClasses.slice(0, 3);
  };

  const handleSeedMonth = async () => {
    if (currentMonth.getFullYear() === 2025 && currentMonth.getMonth() === 8) {
      setSeeding(true);
      try {
        const result = await seedSeptember2025();
        if (result.success) {
          await refetch();
        } else {
          alert('Error al generar clases: ' + result.message);
        }
      } catch (error) {
        alert('Error inesperado al generar clases');
      } finally {
        setSeeding(false);
      }
    }
  };

  const handleClassClick = (cls: BreatheMoveClass) => {
    setEditingClass(cls);
    setShowEditModal(true);
  };

  const handleDeleteClass = async (id: string, className: string) => {
    deleteClass.mutate(
      { id, className },
      {
        onSuccess: () => {
          // Si está abierto el modal, cerrarlo después de eliminar exitosamente
          if (showEditModal) {
            setShowEditModal(false);
            setEditingClass(null);
          }
        }
      }
    );
  };

  const previousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Skeleton loader optimizado
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Breathe & Move</h1>
            <p className="text-gray-600">Gestión de clases y horarios</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/breathe-move/new"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Clase
            </Link>
            <Link
              href="/dashboard/breathe-move/schedule"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Horario Semanal
            </Link>
            {currentMonth.getFullYear() === 2025 && currentMonth.getMonth() === 8 && classes.length === 0 && (
              <button
                onClick={handleSeedMonth}
                disabled={seeding}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
                {seeding ? 'Generando...' : 'Generar Clases Sept 2025'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calendario mensual */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Grid del calendario */}
        <div className="grid grid-cols-7 gap-1 bg-gray-100 p-1 rounded-lg">
          {/* Encabezados */}
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}

          {/* Días vacíos al inicio */}
          {Array.from({ 
            length: monthDays[0].getDay() === 0 ? 6 : monthDays[0].getDay() - 1 
          }, (_, index) => (
            <div key={`empty-${index}`} className="bg-white p-2 min-h-[120px]" />
          ))}

          {/* Días del mes */}
          {monthDays.map((date) => {
            const dayClasses = getDayClasses(date);
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isSunday = date.getDay() === 0;

            return (
              <div
                key={date.toISOString()}
                className={`bg-white p-2 min-h-[120px] rounded-md hover:shadow-md cursor-pointer transition-all duration-200 relative ${
                  isToday ? 'ring-2 ring-green-500' : ''
                } ${isSelected ? 'ring-2 ring-blue-600 bg-blue-50 shadow-xl transform scale-[1.02] z-10 border-blue-200' : 'border border-gray-200'} ${isSunday ? 'bg-gray-50' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                <div className={`font-semibold text-sm mb-1 ${isSelected ? 'text-blue-700' : ''}`}>
                  {format(date, 'd')}
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                  )}
                </div>
                {isSunday ? (
                  <div className="text-xs text-gray-400 italic">Sin clases</div>
                ) : (
                  <div className="space-y-1">
                    {dayClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className={`text-xs p-1 rounded text-white cursor-pointer hover:opacity-80 ${
                          classColors[cls.class_name] || 'bg-gray-400'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClassClick(cls);
                        }}
                      >
                        <div className="font-semibold truncate">{cls.start_time.slice(0, 5)}</div>
                        <div className="truncate">{cls.class_name}</div>
                      </div>
                    ))}
                    {getClassesForDate(date).length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{getClassesForDate(date).length - 3} más
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 ease-out">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Clases del {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            {getClassesForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500">No hay clases programadas para este día</p>
            ) : (
              getClassesForDate(selectedDate).map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-2 h-16 rounded ${classColors[cls.class_name] || 'bg-gray-400'}`} />
                    <div>
                      <h4 className="font-semibold text-lg">{cls.class_name}</h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}
                        </span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {cls.current_capacity}/{cls.max_capacity} inscritos
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Instructor: {cls.instructor}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      cls.current_capacity >= cls.max_capacity 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {cls.current_capacity >= cls.max_capacity ? 'Lleno' : 'Disponible'}
                    </span>
                    <div className="flex space-x-1">
                      <Link
                        href={`/dashboard/breathe-move/${cls.id}/edit`}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Editar clase"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteClass(cls.id, cls.class_name)}
                        disabled={deleteClass.isPending}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar clase"
                      >
                        {deleteClass.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de edición optimizado */}
      <EditClassModal
        isOpen={showEditModal}
        classData={editingClass}
        onClose={() => {
          setShowEditModal(false);
          setEditingClass(null);
        }}
      />

      {/* Estadísticas del mes */}
      <ClassStatistics classes={classes} />
    </div>
  );
}


// Componente de estadísticas memoizado
const ClassStatistics = memo(({ classes }: { classes: BreatheMoveClass[] }) => {
  const stats = useMemo(() => ({
    total: classes.length,
    capacity: classes.reduce((sum, cls) => sum + cls.max_capacity, 0),
    occupancy: classes.length > 0 
      ? Math.round(
          classes.reduce((sum, cls) => sum + (cls.current_capacity / cls.max_capacity * 100), 0) / 
          classes.length
        )
      : 0
  }), [classes]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total de clases</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <Calendar className="w-8 h-8 text-green-500" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Capacidad total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.capacity}</p>
          </div>
          <Users className="w-8 h-8 text-blue-500" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Ocupación promedio</p>
            <p className="text-2xl font-bold text-gray-800">{stats.occupancy}%</p>
          </div>
          <MapPin className="w-8 h-8 text-orange-500" />
        </div>
      </div>
    </div>
  );
});

ClassStatistics.displayName = 'ClassStatistics';

// Importar addDays que faltaba
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}