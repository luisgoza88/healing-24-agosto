"use client";

import { useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { useUpdateClass, useDeleteClass, type BreatheMoveClass } from "@/src/hooks/useBreatheMoveClasses";
import { format } from "date-fns";

// Constantes para las clases e instructores
const CLASS_TYPES = [
  'WildPower', 'GutReboot', 'FireRush', 'BloomBeat', 
  'WindMove', 'ForestFire', 'StoneBarre', 'OmRoot', 
  'HazeRocket', 'MoonRelief', 'WindFlow', 'WaveMind'
];

const INSTRUCTORS = [
  'JENNY', 'FERNANDA', 'KARO', 'CLARA', 'HELEN', 
  'SARA', 'KATA', 'MANUELA', 'MAYTECK', 'GOURA'
];

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: BreatheMoveClass | null;
}

export default function EditClassModal({ isOpen, onClose, classData }: EditClassModalProps) {
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  
  const [formData, setFormData] = useState({
    class_name: classData?.class_name || '',
    instructor: classData?.instructor || '',
    class_date: classData?.class_date || '',
    start_time: classData?.start_time?.slice(0, 5) || '',
    max_capacity: classData?.max_capacity || 12,
    intensity: classData?.intensity || 'medium',
  });

  if (!isOpen || !classData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateClass.mutate(
      { id: classData.id, data: formData },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  const handleDelete = () => {
    deleteClass.mutate(
      { id: classData.id, className: formData.class_name },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  // Calcular hora fin automáticamente
  const calculateEndTime = (startTime: string) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
    const endMinutes = (minutes + 50) % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Editar Clase</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                <option value="">Seleccionar instructor</option>
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
                  value={calculateEndTime(formData.start_time)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  disabled
                />
              </div>
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
                onChange={(e) => setFormData({ ...formData, intensity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={updateClass.isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {updateClass.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Actualizar"
              )}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteClass.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {deleteClass.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}