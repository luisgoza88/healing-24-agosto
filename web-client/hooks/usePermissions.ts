'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole, Permission } from '@/../../shared/types/auth'

export function usePermissions() {
  const [role, setRole] = useState<UserRole>('client')
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadUserPermissions()
  }, [])

  async function loadUserPermissions() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Obtener rol del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setRole(profile.role as UserRole)
      }

      // Obtener permisos
      const { data: userPermissions } = await supabase
        .from('my_permissions')
        .select('resource, action')
      
      if (userPermissions) {
        setPermissions(userPermissions)
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (resource: string, action: string): boolean => {
    // Super admin tiene acceso a todo
    if (role === 'super_admin') return true
    
    // Verificar permiso específico
    return permissions.some(p => 
      (p.resource === resource && p.action === action) ||
      (p.resource === resource && p.action === 'full_access') ||
      (p.resource === 'all' && p.action === 'full_access')
    )
  }

  const can = {
    // Citas
    viewAllAppointments: () => hasPermission('appointments.all', 'view'),
    createAppointment: () => hasPermission('appointments', 'create_own') || hasPermission('appointments', 'create_any'),
    modifyAnyAppointment: () => hasPermission('appointments.all', 'modify'),
    cancelAnyAppointment: () => hasPermission('appointments.cancel_any', 'execute'),
    
    // Pagos
    viewAllPayments: () => hasPermission('payments.all', 'view'),
    processRefund: () => hasPermission('payments.refund', 'process'),
    
    // Pacientes
    viewAllPatients: () => hasPermission('patients.all', 'view'),
    viewMedicalHistory: () => hasPermission('patients.medical_history', 'view'),
    modifyMedicalHistory: () => hasPermission('patients.medical_history', 'modify'),
    
    // Profesionales
    manageProfessionals: () => hasPermission('professionals.manage', 'modify'),
    viewProfessionals: () => hasPermission('professionals', 'view'),
    
    // Servicios
    manageServices: () => hasPermission('services.manage', 'modify'),
    modifyPricing: () => hasPermission('services.pricing', 'modify'),
    
    // Reportes
    viewFinancialReports: () => hasPermission('reports.financial', 'view'),
    viewOperationalReports: () => hasPermission('reports.operational', 'view'),
    
    // Configuración
    modifySettings: () => hasPermission('settings.general', 'modify'),
    manageUsers: () => hasPermission('settings.users', 'full_access'),
    
    // Notificaciones
    sendMassNotifications: () => hasPermission('notifications.send_all', 'execute')
  }

  return {
    role,
    permissions,
    loading,
    hasPermission,
    can
  }
}