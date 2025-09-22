import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'

let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null =
  typeof window !== 'undefined' && (window as any).__hf_supabase_client
    ? (window as any).__hf_supabase_client
    : null

// Cliente para componentes Client (browser)
export function createClient() {
  const configuredFlow = process.env.NEXT_PUBLIC_SUPABASE_AUTH_FLOW
  const authFlow = configuredFlow === 'implicit' ? 'implicit' : 'pkce'

  // Si estamos en el cliente, usa singleton en window
  if (typeof window !== 'undefined') {
    if (supabaseInstance) return supabaseInstance
    supabaseInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: authFlow,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: {
            'x-client-info': 'healing-dashboard-v2',
            'x-client-version': '2.0.0',
          },
        },
        realtime: { params: { eventsPerSecond: 5 } },
      }
    )
    ;(window as any).__hf_supabase_client = supabaseInstance
    return supabaseInstance
  }

  // Si estamos en el server (durante render híbrido), crea un cliente efímero sin persistencia
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: authFlow,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'x-client-info': 'healing-dashboard-v2',
          'x-client-version': '2.0.0',
        },
      },
      realtime: { params: { eventsPerSecond: 5 } },
    }
  )
}

export function useSupabase() {
  return createClient()
}

export function resetSupabaseInstance() {
  supabaseInstance = null
}
