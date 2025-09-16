"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, Calendar, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCreateClass } from "@/src/hooks/useBreatheMoveClasses";
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

export default function NewClassPage() {
  const router = useRouter();
  const createClass = useCreateClass();
  const [formData, setFormData] = useState({
    class_name: '',
    instructor: '',
    class_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '07:00',
    max_capacity: 12,
    intensity: 'medium' as 'low' | 'medium' | 'high',
    status: 'scheduled'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    createClass.mutate(formData, {
      onSuccess: () => {
        router.push('/dashboard/breathe-move');
      }
    });
  };

  // Calcular hora fin para mostrar
  const calculateEndTime = () => {
    const [hours, minutes] = formData.start_time.split(':').map(Number);
    const endHours = minutes + 50 >= 60 ? hours + 1 : hours;
    const endMinutes = (minutes + 50) % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
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
              <h1 className="text-2xl font-bold text-gray-800">Nueva Clase</h1>
              <p className="text-gray-600">Programa una nueva clase de Breathe & Move</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Clase *
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
              Instructor *
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
              Fecha *
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.class_date}
                onChange={(e) => setFormData({ ...formData, class_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              <Calendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora Inicio *
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
                value={calculateEndTime()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Calculada automáticamente (+50 min)</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidad Máxima *
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
              Intensidad *
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
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <Link
            href="/dashboard/breathe-move"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createClass.isPending}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
          >
            {createClass.isPending ? (
              <span className="flex items-center">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </span>
            ) : (
              <span className="flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Crear Clase
              </span>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-800 mb-2">Notas importantes:</h3>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li>No se pueden programar clases los domingos</li>
          <li>Todas las clases tienen una duración de 50 minutos</li>
          <li>La hora de finalización se calcula automáticamente</li>
          <li>Verifica la disponibilidad del salón antes de crear la clase</li>
        </ul>
      </div>
    </div>
  );
}