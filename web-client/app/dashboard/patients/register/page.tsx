import { createClient } from '@/lib/supabase/server'
import { hasPermission } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'
import { SystemResources, Actions } from '@/../../shared/types/auth'
import PatientRegistration from '@/components/admin/PatientRegistration'

export default async function PatientRegistrationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Verificar permisos para crear pacientes
  const canCreate = await hasPermission(SystemResources.PATIENTS, Actions.CREATE)
  if (!canCreate) {
    redirect('/dashboard')
  }

  return <PatientRegistration />
}