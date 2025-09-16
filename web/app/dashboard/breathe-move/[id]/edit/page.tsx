"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, Save, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";
import { useUpdateClass, useDeleteClass } from "@/src/hooks/useBreatheMoveClasses";

// Importamos las constantes de las clases y instructores
const CLASS_TYPES = [
  'WildPower', 'GutReboot', 'FireRush', 'BloomBeat', 
  'WindMove', 'ForestFire', 'StoneBarre', 'OmRoot', 
  'HazeRocket', 'MoonRelief', 'WindFlow', 'WaveMind'
];

const INSTRUCTORS = [
  'JENNY', 'FERNANDA', 'KARO', 'CLARA', 'HELEN', 
  'SARA', 'KATA', 'MANUELA', 'MAYTECK', 'GOURA'
];

interface BreatheMoveClass {
  id: string;
  class_name: string;
  instructor: string;
  class_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_capacity: number;
  status: string;
  intensity: string;
}

export default function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const updateClass = useUpdateClass();
  const deleteClassMutation = useDeleteClass();
  const resolvedParams = use(params);
  const classId = resolvedParams.id;
  
  const [classData, setClassData] = useState<BreatheMoveClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    class_name: '',
    instructor: '',
    class_date: '',
    start_time: '',
    max_capacity: 12,
    intensity: 'medium' as 'low' | 'medium' | 'high',
    status: 'scheduled'
  });

  useEffect(() => {
    loadClass();
  }, [classId]);

  const loadClass = async () => {
    try {
      const { data, error } = await supabase
        .from('breathe_move_classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (error) {
        console.error('Error loading class:', error);
        alert('Error al cargar la clase');
        router.push('/dashboard/breathe-move');
        return;
      }

      setClassData(data);
      setFormData({
        class_name: data.class_name,
        instructor: data.instructor,
        class_date: data.class_date,
        start_time: data.start_time.slice(0, 5),
        max_capacity: data.max_capacity,
        intensity: data.intensity,
        status: data.status
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Error inesperado al cargar la clase');
      router.push('/dashboard/breathe-move');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateClass.mutate(
      { id: classId, data: formData },
      {
        onSuccess: () => {
          router.push('/dashboard/breathe-move');
        }
      }
    );
  };

  const handleDelete = () => {
    if (!classData) return;
    
    deleteClassMutation.mutate(
      { id: classId, className: classData.class_name },
      {
        onSuccess: () => {
          router.push('/dashboard/breathe-move');
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="p-8">
        <p>Clase no encontrada</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/breathe-move"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Editar Clase</h1>
              <p className="text-gray-600">Modifica los detalles de la clase</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleteClassMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
          >
            {deleteClassMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Eliminar Clase
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <option value="">Selecciona una clase</option>
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
              <option value="">Selecciona un instructor</option>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora de Inicio
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
              Capacidad Máxima
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.max_capacity}
              onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intensidad
            </label>
            <select
              value={formData.intensity}
              onChange={(e) => setFormData({ ...formData, intensity: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="scheduled">Programada</option>
              <option value="cancelled">Cancelada</option>
              <option value="completed">Completada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ocupación Actual
            </label>
            <p className="px-3 py-2 bg-gray-100 rounded-lg">
              {classData.current_capacity} / {classData.max_capacity} inscritos
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Link
            href="/dashboard/breathe-move"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={updateClass.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
          >
            {updateClass.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar Cambios
          </button>
        </div>
      </form>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Nota importante:</strong> Las clases no deben programarse los domingos. 
          El sistema automáticamente rechazará cualquier intento de crear clases en domingo.
        </p>
      </div>
    </div>
  );
}