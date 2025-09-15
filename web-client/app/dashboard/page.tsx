import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { UserRole } from '@/../../shared/types/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  const userRole = await getUserRole()
  
  // Si es un cliente regular, redirigir al dashboard de cliente
  if (userRole === 'client') {
    redirect('/')
  }
  
  return <AdminDashboard user={user} userRole={userRole} />
}