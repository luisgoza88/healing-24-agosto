import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'

// ✅ CLIENTE SUPABASE ÚNICO PARA TODO EL DASHBOARD
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // Singleton pattern - una sola instancia para toda la aplicación
  if (supabaseInstance) {
    return supabaseInstance
  }

  console.log('[Supabase] Creating single client instance with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  supabaseInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'healing-dashboard-auth',
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-client-info': 'healing-dashboard-v2',
          'x-client-version': '2.0.0'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 5 // Reducido para optimizar
        }
      }
    }
  )

  return supabaseInstance
}

// ✅ HOOK PARA USAR EL CLIENTE ÚNICO
export function useSupabase() {
  return createClient()
}

// ✅ FUNCIÓN PARA RESETEAR LA INSTANCIA (útil para testing)
export function resetSupabaseInstance() {
  supabaseInstance = null
}



