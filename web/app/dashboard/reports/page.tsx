'use client'

import { 
  DollarSign, 
  Calendar, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  FileText,
  Activity,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { useReportsDashboard } from '@/hooks/useReports'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'

export default function ReportsPage() {
  const { data, isLoading, error, refetch } = useReportsDashboard()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
          <p className="text-sm text-gray-600 mt-1">Panel administrativo - Análisis y métricas del negocio</p>
        </div>
        <LoadingSkeleton rows={8} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
          <p className="text-sm text-gray-600 mt-1">Panel administrativo - Análisis y métricas del negocio</p>
        </div>
        <ErrorState message="Error al cargar los reportes" onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
          <p className="text-sm text-gray-600 mt-1">Panel administrativo - Análisis y métricas del negocio</p>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.monthlyRevenue)}
              </p>
              <p className={`text-sm mt-2 flex items-center ${
                data.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                {formatPercentage(Math.abs(data.revenueChange))} vs mes anterior
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
              <p className="text-sm text-gray-600">Citas del Mes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.monthlyAppointments}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Total histórico: {data.totalAppointments}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pacientes Activos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.activePatients}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                De {data.totalPatients} totales
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasa de Completitud</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPercentage(data.completionRate)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {data.completedAppointments} completadas
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Enlaces a Reportes Detallados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/reports/revenue" className="block">
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart2 className="h-8 w-8 text-green-600" />
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Reporte de Ingresos</h3>
            <p className="text-sm text-gray-600 mt-2">
              Análisis detallado de ingresos, tendencias y rendimiento por profesional
            </p>
            <div className="mt-4 flex items-center text-green-600">
              <span className="text-sm font-medium">Ver reporte completo</span>
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/reports/appointments" className="block">
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Reporte de Citas</h3>
            <p className="text-sm text-gray-600 mt-2">
              Estadísticas de citas, ocupación y eficiencia operacional
            </p>
            <div className="mt-4 flex items-center text-blue-600">
              <span className="text-sm font-medium">Ver reporte completo</span>
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/reports/patients" className="block">
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Reporte de Pacientes</h3>
            <p className="text-sm text-gray-600 mt-2">
              Demografía, retención y análisis de comportamiento de pacientes
            </p>
            <div className="mt-4 flex items-center text-purple-600">
              <span className="text-sm font-medium">Ver reporte completo</span>
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </Link>
      </div>

      {/* Resumen Rápido */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Período Actual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-gray-600">Ingreso Total Histórico</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.totalRevenue)}
            </p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-gray-600">Promedio Mensual de Citas</p>
            <p className="text-lg font-semibold text-gray-900">
              {Math.round(data.totalAppointments / 12)}
            </p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-gray-600">Tasa de Actividad</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatPercentage((data.activePatients / data.totalPatients) * 100)}
            </p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <p className="text-gray-600">Citas Promedio por Paciente</p>
            <p className="text-lg font-semibold text-gray-900">
              {(data.totalAppointments / data.totalPatients).toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}