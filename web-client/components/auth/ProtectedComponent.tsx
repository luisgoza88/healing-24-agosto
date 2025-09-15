'use client'

import { usePermissions } from '@/hooks/usePermissions'
import { ReactNode } from 'react'

interface ProtectedComponentProps {
  resource: string
  action: string
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedComponent({ 
  resource, 
  action, 
  children, 
  fallback = null 
}: ProtectedComponentProps) {
  const { hasPermission, loading } = usePermissions()
  
  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded h-8 w-24"></div>
  }
  
  if (!hasPermission(resource, action)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Componente helper para mostrar contenido basado en rol
export function RoleBasedContent({ 
  allowedRoles, 
  children, 
  fallback = null 
}: { 
  allowedRoles: string[]
  children: ReactNode
  fallback?: ReactNode 
}) {
  const { role, loading } = usePermissions()
  
  if (loading) return null
  
  if (!allowedRoles.includes(role)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}