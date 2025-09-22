"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/browser'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = getSupabaseBrowser()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Verificar si el usuario tiene rol de admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          router.push('/dashboard')
        } else {
          setError('No tienes permisos de administrador')
          await supabase.auth.signOut()
        }
      }
    } catch (err) {
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-hf-beige px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-16 h-16 rounded-full border-2 border-hf-primary flex items-center justify-center bg-white">
                <span className="text-2xl font-bold text-hf-dark">HF</span>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-semibold text-hf-dark leading-6">Healing</h1>
                <h2 className="text-2xl font-semibold text-hf-primary leading-6">Forest</h2>
              </div>
            </div>
            <p className="mt-4 text-gray-600">Dashboard Administrativo</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hf-primary focus:border-transparent outline-none transition"
                placeholder="admin@healingforest.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hf-primary focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-hf-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              ¿Problemas para acceder?{' '}
              <a href="#" className="text-hf-primary hover:underline">
                Contactar soporte
              </a>
            </p>
          </div>
        </div>

        {/* Helper text */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Usa las credenciales de administrador que tienes en Supabase. 
            Solo los usuarios con rol "admin" pueden acceder al dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}