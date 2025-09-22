import LoginClient from './login-client'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/server-supabase'

export default async function Page() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }
  return <LoginClient />
}
