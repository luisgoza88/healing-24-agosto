// Tipos básicos de la base de datos
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name?: string
          phone?: string
          date_of_birth?: string
          gender?: string
          city?: string
          address?: string
          medical_conditions?: string
          allergies?: string
          role?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          phone?: string
          date_of_birth?: string
          gender?: string
          city?: string
          address?: string
          medical_conditions?: string
          allergies?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string
          date_of_birth?: string
          gender?: string
          city?: string
          address?: string
          medical_conditions?: string
          allergies?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          user_id: string
          professional_id: string
          service_id?: string
          appointment_date: string
          appointment_time: string
          status: string
          total_amount: number
          payment_status?: string
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          professional_id: string
          service_id?: string
          appointment_date: string
          appointment_time: string
          status?: string
          total_amount?: number
          payment_status?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          professional_id?: string
          service_id?: string
          appointment_date?: string
          appointment_time?: string
          status?: string
          total_amount?: number
          payment_status?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      professionals: {
        Row: {
          id: string
          full_name: string
          email: string
          phone?: string
          specialties?: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone?: string
          specialties?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string
          specialties?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description?: string
          base_price: number
          duration_minutes: number
          category?: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          base_price?: number
          duration_minutes?: number
          category?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          base_price?: number
          duration_minutes?: number
          category?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          appointment_id?: string
          user_id: string
          amount: number
          status: string
          payment_method?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id?: string
          user_id: string
          amount: number
          status?: string
          payment_method?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          user_id?: string
          amount?: number
          status?: string
          payment_method?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_credits: {
        Row: {
          user_id: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          description?: string
          appointment_id?: string
          expires_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          description?: string
          appointment_id?: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          description?: string
          appointment_id?: string
          expires_at?: string
          created_at?: string
        }
      }
      breathe_move_classes: {
        Row: {
          id: string
          class_name: string
          instructor: string
          class_date: string
          start_time: string
          end_time: string
          max_capacity: number
          current_capacity: number
          status: string
          intensity: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_name: string
          instructor: string
          class_date: string
          start_time: string
          end_time: string
          max_capacity?: number
          current_capacity?: number
          status?: string
          intensity?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_name?: string
          instructor?: string
          class_date?: string
          start_time?: string
          end_time?: string
          max_capacity?: number
          current_capacity?: number
          status?: string
          intensity?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      get_user_roles: {
        Args: {
          user_id: string
        }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}



