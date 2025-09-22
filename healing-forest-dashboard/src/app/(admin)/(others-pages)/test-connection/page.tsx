"use client"

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'

export default function TestConnectionPage() {
  const [status, setStatus] = useState<any>({})
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowser()
    
    const results: any = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ No configurada',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada',
    }

    try {
      // Test 1: Verificar conexión básica
      const { data: profilesCount, error: profilesError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .limit(1)
      
      results.profilesTable = profilesError 
        ? `❌ Error: ${profilesError.message}` 
        : `✅ Conectado (${profilesCount?.length || 0} registros accesibles)`

      // Test 2: Verificar tabla de citas
      const { data: appointmentsCount, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .limit(1)
      
      results.appointmentsTable = appointmentsError
        ? `❌ Error: ${appointmentsError.message}`
        : `✅ Conectado (${appointmentsCount?.length || 0} registros accesibles)`

      // Test 3: Verificar servicios
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('name')
        .limit(5)
      
      results.servicesTable = servicesError
        ? `❌ Error: ${servicesError.message}`
        : `✅ Conectado (${servicesData?.length || 0} servicios)`

      // Test 4: Verificar autenticación
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      results.authentication = authError || !user
        ? `❌ No autenticado: ${authError?.message || 'No hay sesión activa'}`
        : `✅ Autenticado como: ${user.email}`

    } catch (error) {
      results.generalError = `❌ Error general: ${error}`
    }

    setStatus(results)
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
          Prueba de Conexión - Supabase
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Verificando la conexión con la base de datos de Healing Forest
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hf-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Probando conexión...</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4">Resultados de la prueba:</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[200px]">URL de Supabase:</span>
                <span className={status.supabaseUrl?.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {status.supabaseUrl}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[200px]">API Key:</span>
                <span className={status.supabaseKey?.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {status.supabaseKey}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[200px]">Tabla Profiles:</span>
                <span className={status.profilesTable?.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {status.profilesTable}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[200px]">Tabla Appointments:</span>
                <span className={status.appointmentsTable?.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {status.appointmentsTable}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[200px]">Tabla Services:</span>
                <span className={status.servicesTable?.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {status.servicesTable}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[200px]">Autenticación:</span>
                <span className={status.authentication?.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {status.authentication}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <button
                onClick={testConnection}
                className="px-4 py-2 bg-hf-primary text-white rounded hover:bg-opacity-90"
              >
                Probar de nuevo
              </button>
            </div>

            {status.generalError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
                {status.generalError}
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Información de depuración:
        </h3>
        <div className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
          <p>URL esperada: https://vgwyhegpymqbljqtskra.supabase.co</p>
          <p>Si ves errores de autenticación, necesitas iniciar sesión primero.</p>
          <p>Si ves errores de permisos, verifica las políticas RLS en Supabase.</p>
        </div>
      </div>
    </div>
  )
}