import { cookies, headers } from 'next/headers'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { Database } from '../types/database'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const cookieHeader = headerStore.get('cookie') || ''
  const cookieObj = parseCookieHeader(cookieHeader)

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(cookieObj).map(([name, value]) => ({ name, value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
      headers: () => headerStore,
    }
  )
}



