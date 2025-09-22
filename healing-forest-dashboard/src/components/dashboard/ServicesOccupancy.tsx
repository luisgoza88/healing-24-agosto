"use client"

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface ServiceOccupancyData {
  name: string
  ocupacion: number
  color: string
}

interface ServicesOccupancyProps {
  data: ServiceOccupancyData[]
  loading?: boolean
}

export const ServicesOccupancy: React.FC<ServicesOccupancyProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-gray-500">Cargando datos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Ocupación por Servicio</h3>
        <p className="text-sm text-gray-500 mt-1">Porcentaje de citas reservadas esta semana</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis 
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            stroke="#9CA3AF"
            fontSize={12}
          />
          
          <YAxis 
            type="category"
            dataKey="name"
            stroke="#9CA3AF"
            fontSize={12}
            width={120}
          />
          
          <Tooltip 
            formatter={(value: number) => `${value}%`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          
          <Bar 
            dataKey="ocupacion" 
            radius={[0, 8, 8, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.map((service) => (
          <div key={service.name} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: service.color }}
            />
            <span className="text-gray-600">{service.name}</span>
            <span className="font-medium text-gray-900 ml-auto">{service.ocupacion}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}