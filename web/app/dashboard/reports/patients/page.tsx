'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase'
import { 
  ArrowLeft,
  Users,
  UserCheck,
  Calendar,
  Download,
  MapPin,
  Heart,
  Activity,
  TrendingUp,
  AlertCircle,
  User
} from 'lucide-react'
import Link from 'next/link'
import { 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts'

interface PatientAnalytics {
  totalPatients: number
  newPatients: number
  activePatients: number
  retentionRate: number
  averageAge: number
  genderDistribution: Array<{ gender: string; count: number; percentage: number }>
  ageDistribution: Array<{ range: string; count: number }>
  cityDistribution: Array<{ city: string; count: number; percentage: number }>
  chronicConditions: Array<{ condition: string; count: number; percentage: number }>
  patientGrowth: Array<{ month: string; total: number; new: number }>
  visitFrequency: Array<{ frequency: string; count: number; percentage: number }>
  patientsByService: Array<{ service: string; count: number }>
  riskPatients: Array<{ name: string; risk: string; lastVisit: string }>
}

const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444']
const AGE_RANGES = ['0-17', '18-25', '26-35', '36-45', '46-55', '56-65', '65+']

export default function PatientsReportPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('month')
  const [analytics, setAnalytics] = useState<PatientAnalytics>({
    totalPatients: 0,
    newPatients: 0,
    activePatients: 0,
    retentionRate: 0,
    averageAge: 0,
    genderDistribution: [],
    ageDistribution: [],
    cityDistribution: [],
    chronicConditions: [],
    patientGrowth: [],
    visitFrequency: [],
    patientsByService: [],
    riskPatients: []
  })
  const supabase = createClient()

  useEffect(() => {
    fetchPatientAnalytics()
  }, [dateRange])

  const fetchPatientAnalytics = async () => {
    try {
      setLoading(true)
      
      const today = new Date()
      const startDate = getStartDate(dateRange)

      // Fetch all patients with their appointments
      const { data: patients, error: patientsError } = await supabase
        .from('profiles')
        .select(`
          *,
          appointments:appointments(
            appointment_date,
            status,
            service:services(name)
          )
        `)

      if (patientsError) throw patientsError

      // Calculate total and new patients
      const totalPatients = patients?.length || 0
      const newPatients = patients?.filter(p => 
        new Date(p.created_at) >= startDate
      ).length || 0

      // Active patients (had appointments in the period)
      const activePatients = patients?.filter(p => 
        p.appointments?.some((apt: any) => 
          new Date(apt.appointment_date) >= startDate && 
          apt.status !== 'cancelled'
        )
      ).length || 0

      // Calculate retention rate (patients with multiple visits)
      const returningPatients = patients?.filter(p => {
        const periodAppointments = p.appointments?.filter((apt: any) =>
          new Date(apt.appointment_date) >= startDate &&
          apt.status === 'completed'
        )
        return periodAppointments?.length > 1
      }).length || 0

      const retentionRate = activePatients > 0 ? (returningPatients / activePatients) * 100 : 0

      // Calculate average age and age distribution
      const ages: number[] = []
      const ageDistributionMap: { [key: string]: number } = {}
      AGE_RANGES.forEach(range => { ageDistributionMap[range] = 0 })

      patients?.forEach(p => {
        if (p.date_of_birth) {
          const age = calculateAge(p.date_of_birth)
          ages.push(age)
          
          const range = getAgeRange(age)
          ageDistributionMap[range]++
        }
      })

      const averageAge = ages.length > 0 
        ? ages.reduce((sum, age) => sum + age, 0) / ages.length 
        : 0

      const ageDistribution = AGE_RANGES.map(range => ({
        range,
        count: ageDistributionMap[range]
      }))

      // Gender distribution
      const genderMap = patients?.reduce((acc: any, p) => {
        const gender = getGenderLabel(p.gender)
        acc[gender] = (acc[gender] || 0) + 1
        return acc
      }, {})

      const genderDistribution = Object.entries(genderMap || {})
        .map(([gender, count]) => ({
          gender,
          count: count as number,
          percentage: ((count as number) / totalPatients) * 100
        }))

      // City distribution
      const cityMap = patients?.reduce((acc: any, p) => {
        const city = p.city || 'No especificado'
        acc[city] = (acc[city] || 0) + 1
        return acc
      }, {})

      const cityDistribution = Object.entries(cityMap || {})
        .map(([city, count]) => ({
          city,
          count: count as number,
          percentage: ((count as number) / totalPatients) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Chronic conditions
      const conditionsMap: { [key: string]: number } = {
        'Hipertensión': 0,
        'Diabetes': 0,
        'Enfermedad Cardíaca': 0,
        'Artritis': 0,
        'Asma': 0,
        'Depresión': 0,
        'Ansiedad': 0,
        'Otras': 0
      }

      patients?.forEach(p => {
        if (p.medical_history?.hypertension) conditionsMap['Hipertensión']++
        if (p.medical_history?.diabetes) conditionsMap['Diabetes']++
        if (p.medical_history?.heart_disease) conditionsMap['Enfermedad Cardíaca']++
        if (p.medical_history?.arthritis) conditionsMap['Artritis']++
        if (p.medical_history?.asthma) conditionsMap['Asma']++
        if (p.medical_history?.depression) conditionsMap['Depresión']++
        if (p.medical_history?.anxiety) conditionsMap['Ansiedad']++
        if (p.medical_conditions && !Object.keys(p.medical_history || {}).some(k => p.medical_history[k])) {
          conditionsMap['Otras']++
        }
      })

      const chronicConditions = Object.entries(conditionsMap)
        .filter(([_, count]) => count > 0)
        .map(([condition, count]) => ({
          condition,
          count,
          percentage: (count / totalPatients) * 100
        }))
        .sort((a, b) => b.count - a.count)

      // Patient growth over months
      const monthlyGrowth: { [key: string]: { total: number; new: number } } = {}
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(today)
        monthDate.setMonth(today.getMonth() - i)
        const monthKey = monthDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
        
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        
        const totalUpToMonth = patients?.filter(p => 
          new Date(p.created_at) <= monthEnd
        ).length || 0
        
        const newInMonth = patients?.filter(p => {
          const createdDate = new Date(p.created_at)
          return createdDate.getMonth() === monthDate.getMonth() && 
                 createdDate.getFullYear() === monthDate.getFullYear()
        }).length || 0
        
        monthlyGrowth[monthKey] = { total: totalUpToMonth, new: newInMonth }
      }

      const patientGrowth = Object.entries(monthlyGrowth)
        .map(([month, data]) => ({
          month,
          total: data.total,
          new: data.new
        }))

      // Visit frequency analysis
      const visitFrequencyMap: { [key: string]: number } = {
        'Primera vez': 0,
        '2-3 visitas': 0,
        '4-6 visitas': 0,
        'Más de 6': 0
      }

      patients?.forEach(p => {
        const completedVisits = p.appointments?.filter((apt: any) => 
          apt.status === 'completed'
        ).length || 0

        if (completedVisits === 1) visitFrequencyMap['Primera vez']++
        else if (completedVisits >= 2 && completedVisits <= 3) visitFrequencyMap['2-3 visitas']++
        else if (completedVisits >= 4 && completedVisits <= 6) visitFrequencyMap['4-6 visitas']++
        else if (completedVisits > 6) visitFrequencyMap['Más de 6']++
      })

      const visitFrequency = Object.entries(visitFrequencyMap)
        .map(([frequency, count]) => ({
          frequency,
          count,
          percentage: (count / totalPatients) * 100
        }))

      // Patients by service
      const serviceMap: { [key: string]: Set<string> } = {}
      
      patients?.forEach(p => {
        p.appointments?.forEach((apt: any) => {
          if (apt.status === 'completed' && apt.service?.name) {
            if (!serviceMap[apt.service.name]) {
              serviceMap[apt.service.name] = new Set()
            }
            serviceMap[apt.service.name].add(p.id)
          }
        })
      })

      const patientsByService = Object.entries(serviceMap)
        .map(([service, patientSet]) => ({
          service,
          count: patientSet.size
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // Risk patients (no visits in 6+ months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const riskPatients = patients?.filter(p => {
        const lastAppointment = p.appointments
          ?.filter((apt: any) => apt.status === 'completed')
          ?.sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())?.[0]
        
        if (!lastAppointment) return false
        
        return new Date(lastAppointment.appointment_date) < sixMonthsAgo
      })
      .map(p => {
        const lastAppointment = p.appointments
          ?.filter((apt: any) => apt.status === 'completed')
          ?.sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())?.[0]
        
        return {
          name: p.full_name,
          risk: 'Alto',
          lastVisit: new Date(lastAppointment.appointment_date).toLocaleDateString('es-ES')
        }
      })
      .slice(0, 5) || []

      setAnalytics({
        totalPatients,
        newPatients,
        activePatients,
        retentionRate,
        averageAge,
        genderDistribution,
        ageDistribution,
        cityDistribution,
        chronicConditions,
        patientGrowth,
        visitFrequency,
        patientsByService,
        riskPatients
      })
    } catch (error) {
      console.error('Error fetching patient analytics:', error)
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

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  const getAgeRange = (age: number): string => {
    if (age < 18) return '0-17'
    if (age <= 25) return '18-25'
    if (age <= 35) return '26-35'
    if (age <= 45) return '36-45'
    if (age <= 55) return '46-55'
    if (age <= 65) return '56-65'
    return '65+'
  }

  const getGenderLabel = (gender?: string) => {
    const labels: { [key: string]: string } = {
      'male': 'Masculino',
      'female': 'Femenino',
      'other': 'Otro'
    }
    return labels[gender || ''] || 'No especificado'
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
          <h1 className="text-2xl font-bold text-gray-900">Análisis de Pacientes</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pacientes</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalPatients}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nuevos Pacientes</p>
              <p className="text-2xl font-bold text-green-600">{analytics.newPatients}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pacientes Activos</p>
              <p className="text-2xl font-bold text-purple-600">{analytics.activePatients}</p>
            </div>
            <Activity className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasa Retención</p>
              <p className="text-2xl font-bold text-blue-600">{analytics.retentionRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Edad Promedio</p>
              <p className="text-2xl font-bold text-yellow-600">{Math.round(analytics.averageAge)} años</p>
            </div>
            <Calendar className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crecimiento de pacientes */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Crecimiento de Pacientes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.patientGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Total Acumulado"
              />
              <Line 
                type="monotone" 
                dataKey="new" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Nuevos en el Mes"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución por género */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Género</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.genderDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.gender}: ${entry.percentage.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics.genderDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por edad */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Edad</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.ageDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Frecuencia de visitas */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Frecuencia de Visitas</h2>
          <div className="space-y-3">
            {analytics.visitFrequency.map((item) => (
              <div key={item.frequency}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-700">{item.frequency}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold">{item.count} pacientes</span>
                    <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Condiciones crónicas */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Condiciones de Salud</h2>
          <div className="space-y-2">
            {analytics.chronicConditions.map((condition, index) => (
              <div key={condition.condition} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center">
                  <Heart className={`h-4 w-4 mr-2 ${index < 3 ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className="text-sm text-gray-700">{condition.condition}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold">{condition.count}</span>
                  <span className="text-xs text-gray-500">({condition.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución geográfica */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Ciudades</h2>
          <div className="space-y-2">
            {analytics.cityDistribution.map((city, index) => (
              <div key={city.city} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center">
                  <MapPin className={`h-4 w-4 mr-2 ${index < 3 ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="text-sm text-gray-700">{city.city}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold">{city.count}</span>
                  <span className="text-xs text-gray-500">({city.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pacientes en riesgo */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pacientes en Riesgo</h2>
          <p className="text-sm text-gray-600 mb-3">Sin visitas en 6+ meses</p>
          <div className="space-y-2">
            {analytics.riskPatients.length > 0 ? (
              analytics.riskPatients.map((patient) => (
                <div key={patient.name} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                      <p className="text-xs text-gray-500">Última visita: {patient.lastVisit}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-red-600">{patient.risk}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No hay pacientes en riesgo</p>
            )}
          </div>
        </div>
      </div>

      {/* Pacientes por servicio */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pacientes por Servicio</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.patientsByService} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="service" width={120} />
            <Tooltip />
            <Bar dataKey="count" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Métricas de retención */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Indicadores de Fidelización</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[
                    { name: 'Retención', value: analytics.retentionRate, fill: '#10B981' }
                  ]}>
                    <RadialBar dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {analytics.retentionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Tasa de Retención</p>
          </div>

          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[
                    { 
                      name: 'Activos', 
                      value: analytics.totalPatients > 0 
                        ? (analytics.activePatients / analytics.totalPatients) * 100 
                        : 0, 
                      fill: '#3B82F6' 
                    }
                  ]}>
                    <RadialBar dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {analytics.totalPatients > 0 
                      ? ((analytics.activePatients / analytics.totalPatients) * 100).toFixed(1)
                      : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Pacientes Activos</p>
          </div>

          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[
                    { 
                      name: 'Nuevos', 
                      value: analytics.totalPatients > 0 
                        ? (analytics.newPatients / analytics.totalPatients) * 100 
                        : 0, 
                      fill: '#F59E0B' 
                    }
                  ]}>
                    <RadialBar dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {analytics.totalPatients > 0 
                      ? ((analytics.newPatients / analytics.totalPatients) * 100).toFixed(1)
                      : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Crecimiento</p>
          </div>
        </div>
      </div>
    </div>
  )
}