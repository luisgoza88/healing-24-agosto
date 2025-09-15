import { createClient } from '@supabase/supabase-js'

// IMPORTANTE: Esta clave NUNCA debe exponerse en el cliente
// Solo usar en Server Components o API Routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente con permisos de admin - SOLO PARA SERVIDOR
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Función helper para crear usuarios sin email de confirmación
export async function createUserWithoutEmail(userData: {
  email: string
  password?: string
  fullName: string
  phone?: string
  additionalData?: any
}) {
  try {
    // Crear usuario con auth.admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password || 'salud',
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name: userData.fullName,
        phone: userData.phone,
        created_by_admin: true
      }
    })

    if (error) throw error

    // Actualizar perfil con datos adicionales
    if (data.user && userData.additionalData) {
      await supabaseAdmin
        .from('profiles')
        .update({
          ...userData.additionalData,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.user.id)
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}