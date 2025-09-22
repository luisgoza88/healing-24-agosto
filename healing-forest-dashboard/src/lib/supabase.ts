import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Tipos de la base de datos
export type Profile = {
  id: string
  full_name: string | null
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  second_last_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  date_of_birth: string | null
  created_at: string
  updated_at: string
  role: 'admin' | 'patient' | 'professional'
}

export type Appointment = {
  id: string
  user_id: string
  service_id: string
  professional_id: string
  appointment_date: string
  appointment_time: string
  end_time: string
  duration: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  total_amount: number
  payment_status: 'pending' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  notes: string | null
}