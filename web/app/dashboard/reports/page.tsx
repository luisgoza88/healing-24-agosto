'use client'

export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
        <p className="text-sm text-gray-600 mt-1">Panel administrativo - Análisis y métricas del negocio</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reportes Disponibles</h2>
        <p className="text-gray-600">Los reportes detallados estarán disponibles próximamente.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">Reporte de Citas</h3>
            <p className="text-sm text-gray-600">Análisis de citas por período</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">Reporte de Ingresos</h3>
            <p className="text-sm text-gray-600">Análisis financiero detallado</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">Reporte de Pacientes</h3>
            <p className="text-sm text-gray-600">Estadísticas de pacientes</p>
          </div>
        </div>
      </div>
    </div>
  )
}