'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole, SystemResources } from '@/../../shared/types/auth'
import {
  Calendar,
  Users,
  FileText,
  BarChart3,
  Settings,
  Home,
  Clock,
  DollarSign,
  Activity,
  UserPlus,
  Shield,
  Stethoscope,
  ClipboardList
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
  resource?: string
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="w-5 h-5" />,
    roles: ['receptionist', 'nurse', 'professional', 'manager', 'admin', 'super_admin']
  },
  {
    label: 'Citas del Día',
    href: '/dashboard/appointments/today',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['receptionist', 'nurse', 'professional', 'manager', 'admin', 'super_admin'],
    resource: SystemResources.APPOINTMENTS
  },
  {
    label: 'Todas las Citas',
    href: '/dashboard/appointments',
    icon: <Clock className="w-5 h-5" />,
    roles: ['receptionist', 'manager', 'admin', 'super_admin'],
    resource: SystemResources.APPOINTMENTS_ALL
  },
  {
    label: 'Mis Citas',
    href: '/dashboard/appointments/my',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['professional'],
    resource: SystemResources.APPOINTMENTS
  },
  {
    label: 'Registro de Pacientes',
    href: '/dashboard/patients/register',
    icon: <UserPlus className="w-5 h-5" />,
    roles: ['receptionist', 'admin', 'super_admin'],
    resource: SystemResources.PATIENTS
  },
  {
    label: 'Lista de Pacientes',
    href: '/dashboard/patients',
    icon: <Users className="w-5 h-5" />,
    roles: ['nurse', 'professional', 'manager', 'admin', 'super_admin'],
    resource: SystemResources.PATIENTS
  },
  {
    label: 'Mis Pacientes',
    href: '/dashboard/patients/my',
    icon: <Users className="w-5 h-5" />,
    roles: ['professional'],
    resource: SystemResources.PATIENTS
  },
  {
    label: 'Historiales Médicos',
    href: '/dashboard/medical-records',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['nurse', 'professional', 'admin', 'super_admin'],
    resource: SystemResources.PATIENTS_MEDICAL_HISTORY
  },
  {
    label: 'Cobros y Pagos',
    href: '/dashboard/payments',
    icon: <DollarSign className="w-5 h-5" />,
    roles: ['receptionist', 'manager', 'admin', 'super_admin'],
    resource: SystemResources.PAYMENTS
  },
  {
    label: 'Profesionales',
    href: '/dashboard/professionals',
    icon: <Stethoscope className="w-5 h-5" />,
    roles: ['manager', 'admin', 'super_admin'],
    resource: SystemResources.PROFESSIONALS
  },
  {
    label: 'Reportes',
    href: '/dashboard/reports',
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ['manager', 'admin', 'super_admin'],
    resource: SystemResources.REPORTS
  },
  {
    label: 'Estadísticas',
    href: '/dashboard/analytics',
    icon: <Activity className="w-5 h-5" />,
    roles: ['manager', 'admin', 'super_admin'],
    resource: SystemResources.REPORTS_OPERATIONAL
  },
  {
    label: 'Gestión de Personal',
    href: '/dashboard/staff',
    icon: <Users className="w-5 h-5" />,
    roles: ['manager', 'admin', 'super_admin'],
    resource: SystemResources.PROFESSIONALS_MANAGE
  },
  {
    label: 'Configuración',
    href: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['admin', 'super_admin'],
    resource: SystemResources.SETTINGS
  },
  {
    label: 'Usuarios',
    href: '/dashboard/users',
    icon: <Shield className="w-5 h-5" />,
    roles: ['super_admin'],
    resource: SystemResources.SETTINGS_USERS
  }
]

interface AdminSidebarProps {
  userRole: UserRole
}

export default function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname()

  // Filtrar items según el rol del usuario
  const visibleItems = navItems.filter(item => item.roles.includes(userRole))

  return (
    <aside className="bg-gray-900 text-white w-64 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-2xl font-bold text-emerald-400">Healing Forest</h2>
        <p className="text-sm text-gray-400 mt-1">Panel Administrativo</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="px-4 py-2 text-sm text-gray-400">
          Rol: <span className="text-emerald-400 font-medium">
            {getRoleDisplayName(userRole)}
          </span>
        </div>
      </div>
    </aside>
  )
}

function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    client: 'Cliente',
    receptionist: 'Recepcionista',
    nurse: 'Enfermera',
    professional: 'Profesional',
    manager: 'Gerente',
    admin: 'Administrador',
    super_admin: 'Super Admin'
  }
  return roleNames[role] || role
}