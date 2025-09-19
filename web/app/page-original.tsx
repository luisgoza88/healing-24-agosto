"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const router = useRouter();
  const { signIn, loading: authLoading, isAuthenticated, isAdmin, error: authError } = useAuth();

  // ✅ REDIRECCIÓN AUTOMÁTICA SI YA ESTÁ LOGUEADO
  useEffect(() => {
    // Solo redirigir cuando termine de cargar y esté autenticado
    if (!authLoading && isAuthenticated && isAdmin) {
      console.log('[Login] User already authenticated and admin, redirecting...');
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!email || !password) {
      setLoginError("Por favor complete todos los campos");
      return;
    }
    
    setLoginLoading(true);
    setLoginError(null);

    try {
      console.log('[Login] Attempting sign in for:', email);
      const result = await signIn(email, password);
      
      if (result.success) {
        console.log('[Login] Sign in successful, redirecting to dashboard...');
        // Redirigir manualmente después del login exitoso
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } else {
        const errorMessage = result.error?.message || 'Error al iniciar sesión';
        console.error('[Login] Sign in failed:', errorMessage);
        setLoginError(errorMessage);
      }
    } catch (error: any) {
      console.error('[Login] Error:', error);
      setLoginError(error.message || "Error al iniciar sesión");
    } finally {
      setLoginLoading(false);
    }
  };

  // Si está cargando la autenticación inicial, mostrar loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Healing Forest</h2>
          <p className="mt-2 text-sm text-gray-600">Panel de Administración</p>
        </div>
        
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow" onSubmit={handleLogin}>
          {(loginError || authError) && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{loginError || authError}</span>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="admin@healingforest.com"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading || authLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loginLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Iniciando sesión...
              </>
            ) : authLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Cargando...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
