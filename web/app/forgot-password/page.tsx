"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient, useSupabase } from '@/lib/supabase';
import { Mail, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("lmg880@gmail.com");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (error: any) {
      setError(error.message || "Error al enviar el email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Healing Forest</h2>
          <p className="mt-2 text-sm text-gray-600">Recuperar Contraseña</p>
        </div>
        
        {!success ? (
          <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow" onSubmit={handleResetPassword}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
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
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Te enviaremos un enlace para restablecer tu contraseña
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Enviando...
                </>
              ) : (
                "Enviar email de recuperación"
              )}
            </button>

            <div className="text-center">
              <Link href="/" className="text-sm text-green-600 hover:text-green-500">
                <ArrowLeft className="inline w-4 h-4 mr-1" />
                Volver al login
              </Link>
            </div>
          </form>
        ) : (
          <div className="mt-8 bg-white p-8 rounded-lg shadow">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                ¡Email enviado!
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Revisa tu correo <strong>{email}</strong> para continuar
              </p>
              <p className="mt-4 text-xs text-gray-500">
                Si no recibes el email en unos minutos, revisa tu carpeta de spam
              </p>
              <Link href="/" className="mt-6 inline-block text-sm text-green-600 hover:text-green-500">
                <ArrowLeft className="inline w-4 h-4 mr-1" />
                Volver al login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}