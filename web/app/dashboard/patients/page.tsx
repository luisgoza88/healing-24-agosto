'use client'

import { useState } from 'react'
import { 
  Search, 
  Filter, 
  UserPlus, 
  Eye, 
  Edit, 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  Download,
  Activity,
  Loader2,
  Users,
  TrendingUp,
  UserCheck,
  Clock,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import { usePatients, usePatientStats, useCities } from '@/src/hooks/usePatients'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import NewPatientModal from '@/components/NewPatientModal'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  TableEmpty,
  TableLoading 
} from '@/components/ui/table'
import DashboardStats from '@/components/DashboardStats'

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState('todos')
  const [cityFilter, setCityFilter] = useState('todos')
  const [showNewModal, setShowNewModal] = useState(false)

  // React Query hooks
  const { data: patients = [], isLoading } = usePatients({
    searchTerm,
    gender: genderFilter,
    city: cityFilter,
  })
  
  const { data: stats } = usePatientStats()
  const { data: cities = [] } = useCities()

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (date?: string) => {
    if (!date) return 'N/A'
    return format(new Date(date), 'dd/MM/yyyy')
  }

  const exportToCSV = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Fecha Nacimiento', 'Género', 'Total Citas', 'Última Cita']
    const rows = patients.map(patient => [
      patient.full_name,
      patient.email,
      patient.phone || '',
      patient.city || '',
      patient.date_of_birth || '',
      patient.gender || '',
      patient.total_appointments.toString(),
      patient.last_appointment || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pacientes_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'male': return 'Masculino'
      case 'female': return 'Femenino'
      case 'other': return 'Otro'
      default: return 'No especificado'
    }
  }

  const getGenderColor = (gender?: string) => {
    switch (gender) {
      case 'male': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      case 'female': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
      case 'other': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">Gestiona tu base de pacientes</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToCSV}
            className="px-4 py-2 text-sm text-foreground/70 hover:text-foreground bg-card border border-border hover:border-primary/50 rounded-lg transition-all duration-200 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 text-sm text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Paciente
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <DashboardStats
          stats={{
            todayAppointments: stats.total,
            totalPatients: stats.active,
            todayRevenue: stats.new_this_month,
            monthlyRevenue: stats.with_appointments
          }}
        />
      )}

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
            >
              <option value="todos">Todos los géneros</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
            </select>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
            >
              <option value="todos">Todas las ciudades</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow hover={false}>
              <TableHead>Paciente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Información</TableHead>
              <TableHead align="center">Citas</TableHead>
              <TableHead>Última Cita</TableHead>
              <TableHead align="right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoading rows={5} columns={6} />
            ) : patients.length === 0 ? (
              <TableEmpty 
                message="No se encontraron pacientes" 
                icon={<Users className="h-12 w-12" />}
              />
            ) : (
              patients.map((patient, index) => (
                <motion.tr
                  key={patient.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{patient.full_name}</div>
                      {patient.medical_record_number && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          HC: {patient.medical_record_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{patient.email}</span>
                      </div>
                      {patient.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{patient.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getGenderColor(patient.gender)}`}>
                          {getGenderText(patient.gender)}
                        </span>
                        {patient.date_of_birth && (
                          <span className="text-xs text-muted-foreground">
                            {calculateAge(patient.date_of_birth)} años
                          </span>
                        )}
                      </div>
                      {patient.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {patient.city}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-1">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{patient.total_appointments}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {patient.last_appointment ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(patient.last_appointment), 'dd MMM yyyy', { locale: es })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin citas</span>
                    )}
                  </TableCell>
                  
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-1">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Link
                          href={`/dashboard/patients/${patient.id}`}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded transition-all duration-200"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Link
                          href={`/dashboard/patients/${patient.id}/edit`}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </motion.div>
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {showNewModal && (
        <NewPatientModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  )
}