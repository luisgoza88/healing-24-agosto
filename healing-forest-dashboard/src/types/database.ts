export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          first_name: string | null
          middle_name: string | null
          last_name: string | null
          second_last_name: string | null
          phone: string | null
          bio: string | null
          date_of_birth: string | null
          gender: string | null
          address: string | null
          city: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          medical_conditions: string | null
          allergies: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          role: 'admin' | 'patient' | 'professional'
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      appointments: {
        Row: {
          id: string
          user_id: string
          professional_id: string | null
          service_id: string
          sub_service_id: string | null
          appointment_date: string
          appointment_time: string
          end_time: string
          duration: number
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          notes: string | null
          internal_notes: string | null
          total_amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          credits_generated: boolean
          credit_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
      }
      services: {
        Row: {
          id: string
          category_id: string
          code: string
          name: string
          description: string | null
          base_price: number | null
          duration_minutes: number | null
          color: string | null
          icon: string | null
          requires_professional: boolean
          max_advance_days: number
          min_advance_hours: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['services']['Insert']>
      }
      service_categories: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          color: string | null
          icon: string | null
          order_index: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['service_categories']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['service_categories']['Insert']>
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
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          intensity: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['breathe_move_classes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['breathe_move_classes']['Insert']>
      }
      payments: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          payment_method: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
          description: string | null
          appointment_id: string | null
          transaction_id: string | null
          gateway_response: string | null
          metadata: Json | null
          processed_at: string | null
          failed_at: string | null
          refunded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      patient_credits: {
        Row: {
          id: string
          patient_id: string
          available_credits: number
          total_earned: number
          total_used: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['patient_credits']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['patient_credits']['Insert']>
      }
      credit_transactions: {
        Row: {
          id: string
          patient_id: string
          appointment_id: string | null
          amount: number
          transaction_type: 'earned' | 'used' | 'expired' | 'adjustment'
          source: string | null
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['credit_transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['credit_transactions']['Insert']>
      }
      professionals: {
        Row: {
          id: string
          full_name: string
          title: string | null
          specialties: string[] | null
          email: string | null
          phone: string | null
          bio: string | null
          avatar_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['professionals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['professionals']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}