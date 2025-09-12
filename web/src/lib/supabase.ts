import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Crear una nueva instancia cada vez para evitar conexiones obsoletas
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'sb-healing-auth-token',
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-client-info': 'healing-forest-web'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  )
}

// Crear instancia singleton con getter para evitar problemas de SSR
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export const supabase = (() => {
  if (typeof window === 'undefined') {
    // En el servidor, siempre crear una nueva instancia
    return createClient()
  }
  
  // En el cliente, usar singleton
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
})()