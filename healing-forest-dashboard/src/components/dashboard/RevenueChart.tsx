"use client"

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RevenueData {
  date: string
  servicios: number
  paquetes: number
  total: number
}

interface RevenueChartProps {
  data: RevenueData[]
  loading?: boolean
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, loading }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'dd MMM', { locale: es })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-gray-500">Cargando datos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Ingresos</h3>
        <p className="text-sm text-gray-500 mt-1">Últimos 30 días</p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorServicios" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3E5444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3E5444" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorPaquetes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B8604D" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#B8604D" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis}
            stroke="#9CA3AF"
            fontSize={12}
          />
          
          <YAxis 
            tickFormatter={formatCurrency}
            stroke="#9CA3AF"
            fontSize={12}
          />
          
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy', { locale: es })}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="square"
          />
          
          <Area
            type="monotone"
            dataKey="servicios"
            stroke="#3E5444"
            fillOpacity={1}
            fill="url(#colorServicios)"
            strokeWidth={2}
            name="Servicios Médicos"
          />
          
          <Area
            type="monotone"
            dataKey="paquetes"
            stroke="#B8604D"
            fillOpacity={1}
            fill="url(#colorPaquetes)"
            strokeWidth={2}
            name="Paquetes & Clases"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}