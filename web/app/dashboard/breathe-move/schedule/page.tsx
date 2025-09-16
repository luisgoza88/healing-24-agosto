"use client";

import { useState } from "react";
import { Clock, User, Activity, Flame, Leaf } from "lucide-react";
import Link from "next/link";

// Importamos el horario oficial desde la app móvil para mantener consistencia
const SEPTEMBER_2025_SCHEDULE = [
  // LUNES
  { id: 'mon-7am', className: 'FireRush', instructor: 'JENNY', time: '07:00', intensity: 'high', dayOfWeek: 1 },
  { id: 'mon-10am', className: 'StoneBarre', instructor: 'HELEN', time: '10:00', intensity: 'medium', dayOfWeek: 1 },
  { id: 'mon-5pm', className: 'OmRoot', instructor: 'KATA', time: '17:00', intensity: 'low', dayOfWeek: 1 },
  { id: 'mon-6pm', className: 'ForestFire', instructor: 'MANUELA', time: '18:00', intensity: 'medium', dayOfWeek: 1 },
  { id: 'mon-7pm', className: 'OmRoot', instructor: 'KATA', time: '19:00', intensity: 'low', dayOfWeek: 1 },

  // MARTES
  { id: 'tue-7am', className: 'BloomBeat', instructor: 'MAYTECK', time: '07:00', intensity: 'medium', dayOfWeek: 2 },
  { id: 'tue-10am', className: 'FireRush', instructor: 'SARA', time: '10:00', intensity: 'high', dayOfWeek: 2 },
  { id: 'tue-5pm', className: 'ForestFire', instructor: 'FERNANDA', time: '17:00', intensity: 'medium', dayOfWeek: 2 },
  { id: 'tue-6pm', className: 'FireRush', instructor: 'FERNANDA', time: '18:00', intensity: 'high', dayOfWeek: 2 },

  // MIÉRCOLES
  { id: 'wed-7am', className: 'ForestFire', instructor: 'KARO', time: '07:00', intensity: 'medium', dayOfWeek: 3 },
  { id: 'wed-10am', className: 'GutReboot', instructor: 'FERNANDA', time: '10:00', intensity: 'low', dayOfWeek: 3 },
  { id: 'wed-5pm', className: 'WindFlow', instructor: 'GOURA', time: '17:00', intensity: 'medium', dayOfWeek: 3 },
  { id: 'wed-6pm', className: 'GutReboot', instructor: 'MANUELA', time: '18:00', intensity: 'low', dayOfWeek: 3 },
  { id: 'wed-7pm', className: 'MoonRelief', instructor: 'MAYTECK', time: '19:00', intensity: 'low', dayOfWeek: 3 },

  // JUEVES
  { id: 'thu-7am', className: 'StoneBarre', instructor: 'JENNY', time: '07:00', intensity: 'medium', dayOfWeek: 4 },
  { id: 'thu-10am', className: 'FireRush', instructor: 'SARA', time: '10:00', intensity: 'high', dayOfWeek: 4 },
  { id: 'thu-5pm', className: 'WildPower', instructor: 'FERNANDA', time: '17:00', intensity: 'high', dayOfWeek: 4 },
  { id: 'thu-6pm', className: 'StoneBarre', instructor: 'FERNANDA', time: '18:00', intensity: 'medium', dayOfWeek: 4 },
  { id: 'thu-7pm', className: 'WaveMind', instructor: 'MAYTECK', time: '19:00', intensity: 'low', dayOfWeek: 4 },

  // VIERNES
  { id: 'fri-7am', className: 'GutReboot', instructor: 'CLARA', time: '07:00', intensity: 'low', dayOfWeek: 5 },
  { id: 'fri-10am', className: 'WindMove', instructor: 'SARA', time: '10:00', intensity: 'low', dayOfWeek: 5 },
  { id: 'fri-5pm', className: 'WindFlow', instructor: 'GOURA', time: '17:00', intensity: 'medium', dayOfWeek: 5 },
  { id: 'fri-6pm', className: 'WindFlow', instructor: 'GOURA', time: '18:00', intensity: 'medium', dayOfWeek: 5 },

  // SÁBADO
  { id: 'sat-10am', className: 'WildPower', instructor: 'CLARA', time: '10:00', intensity: 'high', dayOfWeek: 6 }
];

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

const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function SchedulePage() {
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(1);
  
  // Agrupar clases por día
  const classesByDay = SEPTEMBER_2025_SCHEDULE.reduce((acc, cls) => {
    if (!acc[cls.dayOfWeek]) acc[cls.dayOfWeek] = [];
    acc[cls.dayOfWeek].push(cls);
    return acc;
  }, {} as { [key: number]: typeof SEPTEMBER_2025_SCHEDULE });

  // Ordenar clases por hora
  Object.keys(classesByDay).forEach(day => {
    classesByDay[parseInt(day)].sort((a, b) => a.time.localeCompare(b.time));
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-800">Horario Semanal - Breathe & Move</h1>
          <Link
            href="/dashboard/breathe-move"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← Volver al calendario
          </Link>
        </div>
        <p className="text-gray-600">
          Horario estándar que se repite cada semana durante todo septiembre 2025
        </p>
      </div>

      {/* Selector de días */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Selecciona un día</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(day => (
            <button
              key={day}
              onClick={() => setSelectedDayOfWeek(day)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                selectedDayOfWeek === day
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {dayNames[day]}
            </button>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Nota:</strong> No hay clases los domingos. El estudio está cerrado.
          </p>
        </div>
      </div>

      {/* Horario del día seleccionado */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">
          Clases del {dayNames[selectedDayOfWeek]}
        </h3>
        <div className="space-y-4">
          {classesByDay[selectedDayOfWeek]?.map((cls) => (
            <div
              key={cls.id}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className={`w-1 h-full ${classColors[cls.className] || 'bg-gray-400'} rounded mr-4`} />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{cls.className}</h4>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {cls.time}
                      </span>
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {cls.instructor}
                      </span>
                      <span className="flex items-center">
                        {cls.intensity === 'high' ? (
                          <Flame className="w-4 h-4 mr-1 text-red-500" />
                        ) : cls.intensity === 'medium' ? (
                          <Activity className="w-4 h-4 mr-1 text-orange-500" />
                        ) : (
                          <Leaf className="w-4 h-4 mr-1 text-green-500" />
                        )}
                        {cls.intensity === 'high' ? 'Alta' : cls.intensity === 'medium' ? 'Media' : 'Baja'} intensidad
                      </span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full ${classColors[cls.className] || 'bg-gray-400'} text-white text-sm`}>
                    50 min
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vista de toda la semana */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Vista Semanal Completa</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Hora</th>
                {[1, 2, 3, 4, 5, 6].map(day => (
                  <th key={day} className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
                    {dayNames[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['07:00', '10:00', '17:00', '18:00', '19:00'].map(time => (
                <tr key={time} className="border-b">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{time}</td>
                  {[1, 2, 3, 4, 5, 6].map(day => {
                    const classAtTime = classesByDay[day]?.find(c => c.time === time);
                    return (
                      <td key={`${day}-${time}`} className="px-2 py-3 text-center">
                        {classAtTime ? (
                          <div className={`${classColors[classAtTime.className] || 'bg-gray-400'} text-white rounded-lg p-2 text-xs`}>
                            <div className="font-semibold">{classAtTime.className}</div>
                            <div>{classAtTime.instructor}</div>
                          </div>
                        ) : (
                          <div className="text-gray-300 text-sm">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-lg mb-3">Leyenda de Intensidad</h4>
          <div className="space-y-2">
            <div className="flex items-center">
              <Flame className="w-5 h-5 mr-2 text-red-500" />
              <span className="text-sm">Alta intensidad - Entrenamiento desafiante</span>
            </div>
            <div className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-500" />
              <span className="text-sm">Media intensidad - Equilibrio perfecto</span>
            </div>
            <div className="flex items-center">
              <Leaf className="w-5 h-5 mr-2 text-green-500" />
              <span className="text-sm">Baja intensidad - Enfoque en relajación</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-lg mb-3">Información Importante</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Todas las clases tienen una duración de 50 minutos</li>
            <li>• Capacidad máxima: 12 personas por clase</li>
            <li>• No hay clases los domingos</li>
            <li>• Este horario se repite semanalmente durante todo septiembre</li>
          </ul>
        </div>
      </div>
    </div>
  );
}