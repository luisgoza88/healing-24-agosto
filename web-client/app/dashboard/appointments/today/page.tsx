import { createClient } from '@/lib/supabase/server'
import { hasPermission } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'
import { SystemResources, Actions } from '@/../../shared/types/auth'
import TodayAppointments from '@/components/admin/TodayAppointments'

export default async function TodayAppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Verificar permisos
  const canView = await hasPermission(SystemResources.APPOINTMENTS, Actions.VIEW)
  if (!canView) {
    redirect('/dashboard')
  }

  return <TodayAppointments />
}