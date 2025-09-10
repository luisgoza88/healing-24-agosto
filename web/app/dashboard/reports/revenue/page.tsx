'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase'
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
  Percent
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

interface RevenueData {
  dailyRevenue: Array<{ date: string; revenue: number; transactions: number }>
  serviceRevenue: Array<{ service: string; revenue: number; percentage: number }>
  professionalRevenue: Array<{ name: string; revenue: number; appointments: number }>
  paymentMethods: Array<{ method: string; count: number; amount: number }>
  monthlyComparison: Array<{ month: string; current: number; previous: number }>
  totalRevenue: number
  totalTransactions: number
  averageTicket: number
  growthRate: number
}

export default function RevenueReportPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month')
  const [selectedService, setSelectedService] = useState('all')
  const [revenueData, setRevenueData] = useState<RevenueData>({
    dailyRevenue: [],
    serviceRevenue: [],
    professionalRevenue: [],
    paymentMethods: [],
    monthlyComparison: [],
    totalRevenue: 0,
    totalTransactions: 0,
    averageTicket: 0,
    growthRate: 0
  })
  const supabase = createClient()

  useEffect(() => {
    fetchRevenueData()
  }, [dateRange, selectedService])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      
      const today = new Date()
      const startDate = getStartDate(dateRange)

      // Base query for appointments
      let query = supabase
        .from('appointments')
        .select(`
          *,
          service:services(name),
          professional:professionals(full_name),
          payment_method
        `)
        .eq('payment_status', 'paid')
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', today.toISOString())

      if (selectedService !== 'all') {
        query = query.eq('service_id', selectedService)
      }

      const { data: appointments, error } = await query

      if (error) throw error

      // Calculate daily revenue
      const dailyRevenueMap = appointments?.reduce((acc: any, apt) => {
        const date = new Date(apt.appointment_date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short'
        })
        if (!acc[date]) {
          acc[date] = { revenue: 0, transactions: 0 }
        }
        acc[date].revenue += apt.total_amount || 0
        acc[date].transactions += 1
        return acc
      }, {})

      const dailyRevenue = Object.entries(dailyRevenueMap || {})
        .map(([date, data]: [string, any]) => ({
          date,
          revenue: data.revenue,
          transactions: data.transactions
        }))
        .slice(-30) // Last 30 days

      // Calculate service revenue
      const serviceRevenueMap = appointments?.reduce((acc: any, apt) => {
        const serviceName = apt.service?.name || 'Otros'
        if (!acc[serviceName]) {
          acc[serviceName] = 0
        }
        acc[serviceName] += apt.total_amount || 0
        return acc
      }, {})

      const totalServiceRevenue = Object.values(serviceRevenueMap || {}).reduce((sum: any, rev) => sum + rev, 0) as number
      
      const serviceRevenue = Object.entries(serviceRevenueMap || {})
        .map(([service, revenue]: [string, any]) => ({
          service,
          revenue,
          percentage: (revenue / totalServiceRevenue) * 100
        }))
        .sort((a, b) => b.revenue - a.revenue)

      // Calculate professional revenue
      const professionalRevenueMap = appointments?.reduce((acc: any, apt) => {
        const professionalName = apt.professional?.full_name || 'No asignado'
        if (!acc[professionalName]) {
          acc[professionalName] = { revenue: 0, appointments: 0 }
        }
        acc[professionalName].revenue += apt.total_amount || 0
        acc[professionalName].appointments += 1
        return acc
      }, {})

      const professionalRevenue = Object.entries(professionalRevenueMap || {})
        .map(([name, data]: [string, any]) => ({
          name,
          revenue: data.revenue,
          appointments: data.appointments
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10) // Top 10 professionals

      // Calculate payment methods
      const paymentMethodsMap = appointments?.reduce((acc: any, apt) => {
        const method = getPaymentMethodLabel(apt.payment_method || 'cash')
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 }
        }
        acc[method].count += 1
        acc[method].amount += apt.total_amount || 0
        return acc
      }, {})

      const paymentMethods = Object.entries(paymentMethodsMap || {})
        .map(([method, data]: [string, any]) => ({
          method,
          count: data.count,
          amount: data.amount
        }))

      // Calculate monthly comparison
      const currentYear = today.getFullYear()
      const monthlyData = []
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(today)
        monthDate.setMonth(today.getMonth() - i)
        const monthName = monthDate.toLocaleDateString('es-ES', { month: 'short' })
        
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        
        const currentMonthRevenue = appointments?.filter(apt => {
          const aptDate = new Date(apt.appointment_date)
          return aptDate >= monthStart && aptDate <= monthEnd
        }).reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0

        // Previous year same month
        const prevYearStart = new Date(monthDate.getFullYear() - 1, monthDate.getMonth(), 1)
        const prevYearEnd = new Date(monthDate.getFullYear() - 1, monthDate.getMonth() + 1, 0)
        
        const { data: prevYearAppts } = await supabase
          .from('appointments')
          .select('total_amount')
          .eq('payment_status', 'paid')
          .gte('appointment_date', prevYearStart.toISOString())
          .lte('appointment_date', prevYearEnd.toISOString())

        const previousMonthRevenue = prevYearAppts?.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0

        monthlyData.push({
          month: monthName,
          current: currentMonthRevenue,
          previous: previousMonthRevenue
        })
      }

      // Calculate totals
      const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0
      const totalTransactions = appointments?.length || 0
      const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

      // Calculate growth rate
      const previousPeriodStart = getPreviousPeriodStart(dateRange)
      const previousPeriodEnd = startDate

      const { data: previousAppointments } = await supabase
        .from('appointments')
        .select('total_amount')
        .eq('payment_status', 'paid')
        .gte('appointment_date', previousPeriodStart.toISOString())
        .lt('appointment_date', previousPeriodEnd.toISOString())

      const previousRevenue = previousAppointments?.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0
      const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

      setRevenueData({
        dailyRevenue,
        serviceRevenue,
        professionalRevenue,
        paymentMethods,
        monthlyComparison: monthlyData,
        totalRevenue,
        totalTransactions,
        averageTicket,
        growthRate
      })
    } catch (error) {
      console.error('Error fetching revenue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStartDate = (range: string) => {
    const today = new Date()
    switch (range) {
      case 'week':
        return new Date(today.setDate(today.getDate() - 7))
      case 'month':
        return new Date(today.setMonth(today.getMonth() - 1))
      case 'quarter':
        return new Date(today.setMonth(today.getMonth() - 3))
      case 'year':
        return new Date(today.setFullYear(today.getFullYear() - 1))
      default:
        return new Date(today.setMonth(today.getMonth() - 1))
    }
  }

  const getPreviousPeriodStart = (range: string) => {
    const startDate = getStartDate(range)
    switch (range) {
      case 'week':
        return new Date(startDate.setDate(startDate.getDate() - 7))
      case 'month':
        return new Date(startDate.setMonth(startDate.getMonth() - 1))
      case 'quarter':
        return new Date(startDate.setMonth(startDate.getMonth() - 3))
      case 'year':
        return new Date(startDate.setFullYear(startDate.getFullYear() - 1))
      default:
        return new Date(startDate.setMonth(startDate.getMonth() - 1))
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'nequi': 'Nequi',
      'daviplata': 'Daviplata'
    }
    return labels[method] || method
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard/reports"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Análisis de Ingresos</h1>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Último año</option>
          </select>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(revenueData.totalRevenue)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transacciones</p>
              <p className="text-2xl font-bold text-gray-900">
                {revenueData.totalTransactions}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(revenueData.averageTicket)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Crecimiento</p>
              <p className={`text-2xl font-bold ${revenueData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueData.growthRate >= 0 ? '+' : ''}{revenueData.growthRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Gráfico de evolución diaria */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución Diaria de Ingresos</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData.dailyRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
            <Tooltip formatter={(value: any) => formatCurrency(value)} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#10B981" 
              fill="#10B981" 
              fillOpacity={0.3}
              name="Ingresos"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingresos por servicio */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingresos por Servicio</h2>
          <div className="space-y-3">
            {revenueData.serviceRevenue.map((service, index) => (
              <div key={service.service}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-700">{service.service}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold">{formatCurrency(service.revenue)}</span>
                    <span className="text-xs text-gray-500">({service.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" 
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top profesionales por ingresos */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Profesionales</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Profesional
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Citas
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Ingresos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {revenueData.professionalRevenue.map((prof, index) => (
                  <tr key={prof.name} className={index < 3 ? 'bg-green-50' : ''}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-600 mr-2">#{index + 1}</span>
                        {prof.name}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {prof.appointments}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(prof.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparación mensual */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Comparación Año Anterior</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={revenueData.monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Año Actual"
              />
              <Line 
                type="monotone" 
                dataKey="previous" 
                stroke="#6B7280" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Año Anterior"
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>

        {/* Métodos de pago */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h2>
          <div className="space-y-3">
            {revenueData.paymentMethods.map((method) => {
              const percentage = (method.amount / revenueData.totalRevenue) * 100
              return (
                <div key={method.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{method.method}</p>
                    <p className="text-sm text-gray-500">{method.count} transacciones</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(method.amount)}</p>
                    <p className="text-sm text-gray-500">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}