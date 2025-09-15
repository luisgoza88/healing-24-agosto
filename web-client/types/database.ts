// Tipos compartidos entre la app móvil y el panel web

export interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  base_price?: number;
  duration_minutes?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Professional {
  id: string;
  user_id?: string;
  full_name: string;
  title?: string;
  specialties?: string[];
  bio?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  professional_id?: string;
  service_id?: string;
  appointment_date: string;
  appointment_time: string;
  end_time: string;
  duration?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
  internal_notes?: string;
  total_amount?: number;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_method?: string;
  created_at: string;
  updated_at: string;
  // Relations
  service?: Service;
  professional?: Professional;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  created_at: string;
  // Relations
  profile?: Profile;
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  bio?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}