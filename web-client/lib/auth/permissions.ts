import { createClient } from '@/lib/supabase/server'
import { UserRole, SystemResources, Actions } from '@/../../shared/types/auth'

export async function getUserRole(): Promise<UserRole> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return 'client'
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  return (profile?.role as UserRole) || 'client'
}

export async function getUserPermissions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []
  
  const { data: permissions } = await supabase
    .from('my_permissions')
    .select('resource, action')
  
  return permissions || []
}

export async function hasPermission(resource: string, action: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  // Usar la función SQL has_permission
  const { data, error } = await supabase
    .rpc('has_permission', {
      user_id: user.id,
      resource,
      action
    })
  
  return data === true
}

export async function canUserAccessAdminPanel(): Promise<boolean> {
  const role = await getUserRole()
  // Solo roles administrativos pueden acceder al panel
  return ['receptionist', 'nurse', 'professional', 'manager', 'admin', 'super_admin'].includes(role)
}

export async function canUserModifyAppointment(appointmentId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  const role = await getUserRole()
  
  // Admins pueden modificar cualquier cita
  if (role === 'admin' || role === 'super_admin') return true
  
  // Usuarios solo pueden modificar sus propias citas
  const { data: appointment } = await supabase
    .from('appointments')
    .select('patient_id')
    .eq('id', appointmentId)
    .single()
  
  return appointment?.patient_id === user.id
}

export async function canUserViewPayment(paymentId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  const role = await getUserRole()
  
  // Admins pueden ver cualquier pago
  if (role === 'admin' || role === 'super_admin') return true
  
  // Usuarios solo pueden ver sus propios pagos
  const { data: payment } = await supabase
    .from('payments')
    .select('user_id')
    .eq('id', paymentId)
    .single()
  
  return payment?.user_id === user.id
}

// Middleware para proteger rutas administrativas
export async function requireAdminAccess() {
  const canAccess = await canUserAccessAdminPanel()
  
  if (!canAccess) {
    throw new Error('Acceso denegado: Se requieren permisos de administrador')
  }
}