export type UserRole = 
  | 'client' 
  | 'receptionist' 
  | 'nurse' 
  | 'professional' 
  | 'manager' 
  | 'admin' 
  | 'super_admin'

export interface Permission {
  resource: string
  action: string
}

export interface UserPermissions {
  role: UserRole
  permissions: Permission[]
}

// Recursos del sistema
export const SystemResources = {
  APPOINTMENTS: 'appointments',
  APPOINTMENTS_ALL: 'appointments.all',
  APPOINTMENTS_MODIFY_ANY: 'appointments.modify_any',
  APPOINTMENTS_CANCEL_ANY: 'appointments.cancel_any',
  PAYMENTS: 'payments',
  PAYMENTS_ALL: 'payments.all',
  PAYMENTS_REFUND: 'payments.refund',
  PATIENTS: 'patients',
  PATIENTS_ALL: 'patients.all',
  PATIENTS_MEDICAL_HISTORY: 'patients.medical_history',
  PROFESSIONALS: 'professionals',
  PROFESSIONALS_MANAGE: 'professionals.manage',
  PROFESSIONALS_SCHEDULE: 'professionals.schedule',
  SERVICES: 'services',
  SERVICES_MANAGE: 'services.manage',
  SERVICES_PRICING: 'services.pricing',
  REPORTS: 'reports',
  REPORTS_FINANCIAL: 'reports.financial',
  REPORTS_OPERATIONAL: 'reports.operational',
  SETTINGS: 'settings',
  SETTINGS_GENERAL: 'settings.general',
  SETTINGS_USERS: 'settings.users',
  NOTIFICATIONS: 'notifications',
  NOTIFICATIONS_SEND_ALL: 'notifications.send_all'
} as const

// Acciones disponibles
export const Actions = {
  VIEW: 'view',
  VIEW_OWN: 'view_own',
  VIEW_ALL: 'view_all',
  CREATE: 'create',
  CREATE_OWN: 'create_own',
  CREATE_ANY: 'create_any',
  MODIFY: 'modify',
  MODIFY_OWN: 'modify_own',
  MODIFY_BASIC: 'modify_basic',
  DELETE: 'delete',
  FULL_ACCESS: 'full_access'
} as const

// Mapa de roles y sus descripciones
export const RoleDescriptions: Record<UserRole, { name: string; description: string }> = {
  client: {
    name: 'Cliente',
    description: 'Usuario regular del sistema, puede gestionar sus propias citas y pagos'
  },
  receptionist: {
    name: 'Recepcionista',
    description: 'Puede gestionar citas, registrar pacientes y procesar pagos básicos'
  },
  nurse: {
    name: 'Enfermera',
    description: 'Puede ver información médica de pacientes y agregar notas'
  },
  professional: {
    name: 'Profesional de Salud',
    description: 'Doctor o terapeuta, puede gestionar sus pacientes e historiales'
  },
  manager: {
    name: 'Gerente',
    description: 'Acceso a reportes y gestión operativa del centro'
  },
  admin: {
    name: 'Administrador',
    description: 'Gestión completa del sistema excepto usuarios'
  },
  super_admin: {
    name: 'Super Administrador',
    description: 'Acceso total al sistema incluyendo gestión de usuarios'
  }
}