"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Verificar si ya hay sesión activa
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[Login] Session already exists, redirecting...');
        router.replace("/dashboard");
      }
    };
    checkSession();
  }, [supabase, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Por favor complete todos los campos");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      console.log('[Login] Attempting login for:', email);
      
      // Intentar login
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        console.error('[Login] Sign in error:', signInError);
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        console.log('[Login] Login successful for:', data.user.email);
        console.log('[Login] Redirecting to dashboard...');
        
        // Redirigir inmediatamente
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('[Login] Unexpected error:', error);
      setError(error.message || "Error al iniciar sesión");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Healing Forest</h2>
          <p className="mt-2 text-sm text-gray-600">Panel de Administración</p>
        </div>
        
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
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
                  disabled={loading}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
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
                  disabled={loading}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
          
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Usuarios de prueba:</p>
            <p className="font-mono text-xs mt-1">lmg880@gmail.com</p>
            <p className="font-mono text-xs">admin@healingforest.com</p>
          </div>
        </form>
      </div>
    </div>
  );
}