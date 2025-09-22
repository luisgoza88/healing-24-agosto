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
  Award,
  Clock,
  Users,
  DollarSign,
  Star,
  Loader2,
  Activity,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { useProfessionals, useProfessionalStats, useSpecialties } from '@/src/hooks/useProfessionals'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import NewProfessionalModal from '@/components/NewProfessionalModal'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import Button from '@/components/ui/button'
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

export default function ProfessionalsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [showNewModal, setShowNewModal] = useState(false)

  // React Query hooks
  const { data: professionals = [], isLoading } = useProfessionals({
    searchTerm,
    specialty: specialtyFilter,
    status: statusFilter,
  })
  
  const { data: stats } = useProfessionalStats()
  const { data: specialties = [] } = useSpecialties()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calculateSuccessRate = (total?: number, completed?: number) => {
    if (!total || total === 0) return 0
    return Math.round((completed! / total) * 100)
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
        Activo
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        Inactivo
      </span>
    )
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
          <h1 className="text-2xl font-bold text-foreground">Profesionales</h1>
          <p className="text-muted-foreground">Gestiona tu equipo de profesionales de la salud</p>
        </div>
        <Button
          onClick={() => setShowNewModal(true)}
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          Nuevo Profesional
        </Button>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Profesionales</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Trabajando Hoy</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.workingToday}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ingresos del Mes</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.monthRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
        
      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
            >
              <option value="todos">Todas las especialidades</option>
              {specialties.map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
            >
              <option value="todos">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setSpecialtyFilter('todos')
                setStatusFilter('todos')
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow hover={false}>
              <TableHead>Profesional</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estadísticas</TableHead>
              <TableHead>Desempeño</TableHead>
              <TableHead align="center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoading rows={5} columns={5} />
            ) : professionals.length === 0 ? (
              <TableEmpty 
                message="No se encontraron profesionales" 
                icon={<Users className="h-12 w-12" />}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {professionals.map((professional, index) => {
                  return (
                    <motion.tr
                      key={professional.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {professional.avatar_url ? (
                              <img className="h-10 w-10 rounded-full object-cover" src={professional.avatar_url} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">{professional.full_name}</div>
                            {professional.title && (
                              <div className="text-sm text-muted-foreground">{professional.title}</div>
                            )}
                            {((professional.specialties && professional.specialties.length > 0) || professional.specialty) && (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mt-1">
                                <Award className="w-3 h-3 mr-1" />
                                {professional.specialties?.join(', ') || professional.specialty}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {professional.email && (
                            <div className="flex items-center text-sm text-foreground">
                              <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                              {professional.email}
                            </div>
                          )}
                          {professional.phone && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                              {professional.phone}
                            </div>
                          )}
                          <div className="mt-2">
                            {getStatusBadge(professional.is_active)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="font-medium text-foreground">{professional.total_appointments || 0}</span>
                            <span className="text-muted-foreground ml-1">citas totales</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="font-medium text-foreground">{professional.completed_appointments || 0}</span>
                            <span className="text-muted-foreground ml-1">completadas</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-foreground">
                                  {calculateSuccessRate(professional.total_appointments, professional.completed_appointments)}%
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">completado</span>
                              </div>
                              <div className="mt-1 w-full bg-muted rounded-full h-2 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${calculateSuccessRate(professional.total_appointments, professional.completed_appointments)}%` }}
                                  transition={{ duration: 0.5, delay: 0.1 }}
                                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center text-sm">
                            <DollarSign className="w-4 h-4 mr-1 text-muted-foreground" />
                            <span className="font-medium text-foreground">{formatCurrency(professional.revenue || 0)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <div className="flex justify-center gap-1">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                            <Link
                              href={`/dashboard/professionals/${professional.id}`}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded transition-all duration-200"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                            <Link
                              href={`/dashboard/professionals/${professional.id}/edit`}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all duration-200"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          </motion.div>
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal para nuevo profesional */}
      <NewProfessionalModal 
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={() => {
          setShowNewModal(false)
          // La recarga se maneja con React Query invalidation
        }}
      />
    </div>
  )
}