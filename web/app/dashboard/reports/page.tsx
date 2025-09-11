'use client'

import { useState } from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Users,
  Activity,
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts'
import { useReportMetrics, useExportReportData } from '@/src/hooks/useReports'

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  
  // React Query hooks
  const { data: metrics, isLoading } = useReportMetrics(dateRange)
  const exportData = useExportReportData(dateRange)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowUpRight className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDownRight className="w-4 h-4 text-red-600" />
    )
  }

  const getGrowthClass = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600'
  }

  if (isLoading || !metrics) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Generando reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Reportes y Analíticas</h1>
            <p className="text-gray-600">Análisis detallado del rendimiento del negocio</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="week">Última semana</option>
              <option value="month">Este mes</option>
              <option value="quarter">Este trimestre</option>
              <option value="year">Este año</option>
            </select>
            <button
              onClick={exportData}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
            >
              <Download className="w-5 h-5" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg mr-2">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600">Ingresos Totales</h3>
            </div>
            <div className={`flex items-center ${getGrowthClass(metrics.revenueGrowth)}`}>
              {getGrowthIcon(metrics.revenueGrowth)}
              <span className="text-xs font-medium">{formatPercentage(metrics.revenueGrowth)}</span>
            </div>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">{formatCurrency(metrics.totalRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">Ticket promedio: {formatCurrency(metrics.averageTicket)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg mr-2">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600">Total de Citas</h3>
            </div>
            <div className={`flex items-center ${getGrowthClass(metrics.appointmentGrowth)}`}>
              {getGrowthIcon(metrics.appointmentGrowth)}
              <span className="text-xs font-medium">{formatPercentage(metrics.appointmentGrowth)}</span>
            </div>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{metrics.totalAppointments}</p>
          <p className="text-sm text-gray-500 mt-1">Completadas: {metrics.completionRate.toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="p-2 bg-purple-50 rounded-lg mr-2">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600">Pacientes Activos</h3>
            </div>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">{metrics.activePatients}</p>
          <p className="text-sm text-gray-500 mt-1">Únicos en el período</p>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="p-2 bg-orange-50 rounded-lg mr-2">
                <Activity className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600">Tasa de Completación</h3>
            </div>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">{metrics.completionRate.toFixed(1)}%</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ingresos mensuales */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <LineChart className="w-5 h-5 mr-2" />
            Evolución de Ingresos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics.monthlyRevenue}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10B981" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Estado de citas */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2" />
            Distribución de Citas por Estado
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={metrics.appointmentsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percentage }) => `${status}: ${percentage.toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {metrics.appointmentsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tablas de rendimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top servicios */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Top Servicios por Ingresos
          </h3>
          <div className="space-y-3">
            {metrics.topServices.map((service, index) => (
              <div key={service.name} className="flex items-center">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mr-3 ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                  index === 1 ? 'bg-gray-100 text-gray-700' : 
                  index === 2 ? 'bg-orange-100 text-orange-700' : 
                  'bg-gray-100 text-gray-600'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-800">{service.name}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(service.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${(service.revenue / metrics.topServices[0].revenue) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{service.count} citas</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rendimiento por profesional */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Rendimiento por Profesional
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                    Profesional
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                    Citas
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                    Ingresos
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.professionalPerformance.slice(0, 5).map((prof) => (
                  <tr key={prof.name} className="border-b hover:bg-gray-50 transition-colors duration-200">
                    <td className="py-3 text-sm text-gray-800">{prof.name}</td>
                    <td className="py-3 text-sm text-center text-gray-600">{prof.appointments}</td>
                    <td className="py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(prof.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}