import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canUserAccessAdminPanel, getUserRole } from '@/lib/auth/permissions'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import { UserRole } from '@/../../shared/types/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Verificar permisos de acceso al panel administrativo
  const canAccess = await canUserAccessAdminPanel()
  if (!canAccess) {
    redirect('/')
  }

  const userRole = await getUserRole()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <AdminSidebar userRole={userRole} />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <AdminHeader user={user} userRole={userRole} />
          
          {/* Page content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
            <div className="container mx-auto px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}