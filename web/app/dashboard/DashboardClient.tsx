"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  UserCog, 
  FileBarChart, 
  LogOut,
  Menu,
  X,
  Activity,
  CreditCard,
  Briefcase,
  Wind,
  AlertTriangle,
  Shield
} from "lucide-react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/appointments", label: "Citas", icon: Calendar },
  { href: "/dashboard/services", label: "Servicios", icon: Briefcase },
  { href: "/dashboard/prueba-desarrollo", label: "Prueba de desarrollo", icon: Activity },
  { href: "/dashboard/breathe-move", label: "Breathe & Move", icon: Wind },
  { href: "/dashboard/patients", label: "Pacientes", icon: Users },
  { href: "/dashboard/professionals", label: "Profesionales", icon: UserCog },
  { href: "/dashboard/credits", label: "Créditos", icon: CreditCard },
  { href: "/dashboard/reports", label: "Reportes", icon: FileBarChart },
];

export default function DashboardClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading, signOut, isAdmin } = useAuth(false);

  // Mostrar spinner mientras carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sesión no iniciada</h2>
          <p className="text-gray-600 mb-4">Por favor inicia sesión para continuar</p>
          <Link href="/" className="text-green-600 hover:text-green-700 underline">
            Ir a Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar móvil */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <h1 className="text-xl font-semibold text-green-600">Healing Forest</h1>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-1 bg-white border-r">
          <div className="flex items-center h-16 px-4 border-b">
            <h1 className="text-xl font-semibold text-green-600">Healing Forest</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <div className="mb-3 px-3 py-2 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Estado:</span>
                {isAdmin ? (
                  <span className="flex items-center text-xs text-green-600">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </span>
                ) : (
                  <span className="text-xs text-gray-600">Usuario</span>
                )}
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 lg:pl-64">
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Bienvenido,</span>
              <span className="ml-2 font-medium">{user?.email || 'Usuario'}</span>
            </div>
            {!isAdmin && (
              <div className="bg-yellow-50 text-yellow-800 text-xs px-2 py-1 rounded-md flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Modo limitado
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}