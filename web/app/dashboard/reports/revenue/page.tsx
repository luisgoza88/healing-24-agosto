'use client'

import { useState } from 'react'
import { 
  ArrowLeft,
  TrendingUp, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  BarChart3,
  LineChart,
  CreditCard,
  Percent,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import Link from 'next/link'
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LineChart as RechartsLineChart,
  Line
} from 'recharts'
import { useRevenueReport } from '@/hooks/useReports'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'

export default function RevenueReportPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(1)),
    to: new Date()
  })

  const { data, isLoading, error, refetch } = useRevenueReport(dateRange)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  const handleDateRangeChange = (range: string) => {
    const today = new Date()
    let from = new Date()
    
    switch (range) {
      case 'week':
        from.setDate(today.getDate() - 7)
        break
      case 'month':
        from.setDate(1)
        break
      case 'quarter':
        from.setMonth(today.getMonth() - 3)
        break
      case 'year':
        from.setFullYear(today.getFullYear() - 1)
        break
    }
    
    setDateRange({ from, to: today })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard/reports" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporte de Ingresos</h1>
            <p className="text-sm text-gray-600 mt-1">Análisis detallado de ingresos y tendencias financieras</p>
          </div>
        </div>
        <LoadingSkeleton rows={10} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard/reports" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporte de Ingresos</h1>
            <p className="text-sm text-gray-600 mt-1">Análisis detallado de ingresos y tendencias financieras</p>
          </div>
        </div>
        <ErrorState message="Error al cargar el reporte de ingresos" onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/reports" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporte de Ingresos</h1>
            <p className="text-sm text-gray-600 mt-1">Análisis detallado de ingresos y tendencias financieras</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          <div className="flex gap-2">
            {['week', 'month', 'quarter', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 capitalize"
              >
                {range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : range === 'quarter' ? 'Trimestre' : 'Año'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transacciones</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.appointmentCount}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.averageTicket)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Percent className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Crecimiento</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center">
                {data.chartData.length > 1 ? (
                  <>
                    {((data.chartData[data.chartData.length - 1].amount - data.chartData[0].amount) / data.chartData[0].amount * 100).toFixed(1)}%
                    <ArrowUpRight className="h-4 w-4 ml-1 text-green-600" />
                  </>
                ) : (
                  '0%'
                )}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Tendencia */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Ingresos</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="formattedDate" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#10b981" 
                fill="#86efac" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Profesionales */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos por Profesional</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.professionalData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ingresos por Servicio */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Servicio</h3>
          <div className="space-y-3">
            {data.serviceData.map((service, index) => {
              const percentage = (service.amount / data.totalRevenue) * 100
              return (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700">{service.name}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(service.amount)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Período</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Servicio más rentable</p>
            <p className="font-semibold text-gray-900">
              {data.serviceData[0]?.name || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Profesional top</p>
            <p className="font-semibold text-gray-900">
              {data.professionalData[0]?.name || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Día con más ingresos</p>
            <p className="font-semibold text-gray-900">
              {data.chartData.reduce((max, day) => 
                day.amount > max.amount ? day : max, 
                data.chartData[0]
              )?.formattedDate || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}