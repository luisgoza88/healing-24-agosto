import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Rutas que requieren autenticación
  const protectedRoutes = [
    '/appointments',
    '/patients', 
    '/breathe-move',
    '/memberships',
    '/payments',
    '/reports',
    '/settings'
  ]

  // Permitir acceso a rutas de autenticación y test
  const publicRoutes = [
    '/admin-login',
    '/test-connection',
    '/signin',
    '/signup',
    '/'
  ]

  const path = request.nextUrl.pathname

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.some(route => path.startsWith(route))) {
    return NextResponse.next()
  }

  // Por ahora, permitir acceso a todas las rutas en desarrollo
  // TODO: Habilitar autenticación cuando esté configurada
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ Modo desarrollo: Autenticación deshabilitada temporalmente')
    return NextResponse.next()
  }

  // En producción, verificar autenticación
  const hasSession = request.cookies.has('hf-admin-auth')
  
  if (!hasSession && protectedRoutes.some(route => path.startsWith(route))) {
    return NextResponse.redirect(new URL('/admin-login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}