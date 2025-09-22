import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/server-supabase'
import type { Database } from '@/types/database'
import { supabaseAdmin } from '@/src/lib/supabase-admin'

const ADMIN_ROLES = ['admin', 'super_admin', 'manager'] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createServerSupabase()

    // Verificar que el usuario actual es admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    let isAdmin = false

    // Intentar con la función RPC unificada
    const { data: isAdminRPC, error: rpcError } = await supabase.rpc('is_admin', {
      user_id: currentUser.id
    })

    if (!rpcError && typeof isAdminRPC === 'boolean') {
      isAdmin = isAdminRPC
    }

    // Fallback a verificación directa en profiles
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

      if (profile?.role && ADMIN_ROLES.includes(profile.role as typeof ADMIN_ROLES[number])) {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Solo administradores pueden crear pacientes' },
        { status: 403 }
      )
    }

    const useServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    let createdUserId: string | null = null
    let createdUserEmail: string | null = null
    let responseMessage = 'Paciente creado exitosamente (sin email de confirmación)'

    if (useServiceRole) {
      // Crear usuario SIN enviar email usando supabaseAdmin
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password || 'salud',
        email_confirm: true,
        user_metadata: {
          full_name: body.full_name,
          phone: body.phone,
          created_by_admin: true
        }
      })

      if (error) {
        if (error.message?.includes('already been registered')) {
          return NextResponse.json(
            { error: 'Este email ya está registrado' },
            { status: 400 }
          )
        }
        throw error
      }

      if (!data.user) {
        throw new Error('No se pudo crear el usuario')
      }

      createdUserId = data.user.id
      createdUserEmail = data.user.email

      // Esperar a que el trigger cree el perfil
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Actualizar el perfil con datos adicionales
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: body.full_name,
          phone: body.phone || null,
          date_of_birth: body.date_of_birth || null,
          gender: body.gender || null,
          address: body.address || null,
          city: body.city || null,
          emergency_contact_name: body.emergency_contact_name || null,
          emergency_contact_phone: body.emergency_contact_phone || null,
          medical_conditions: body.medical_conditions || null,
          allergies: body.allergies || null,
          bio: body.bio || null,
        })
        .eq('id', data.user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }
    } else {
      responseMessage = 'Paciente creado; se envió email de confirmación (falta configurar Service Role Key)'

      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password || 'salud',
        options: {
          data: {
            full_name: body.full_name,
            phone: body.phone,
            created_by_admin: true,
          },
        }
      })

      if (error) {
        if (error.message?.includes('registered')) {
          return NextResponse.json(
            { error: 'Este email ya está registrado' },
            { status: 400 }
          )
        }
        throw error
      }

      if (!data?.user) {
        throw new Error('No se pudo crear el usuario')
      }

      createdUserId = data.user.id
      createdUserEmail = data.user.email

      // Esperar a que el trigger cree el perfil
      await new Promise(resolve => setTimeout(resolve, 1000))

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: body.full_name,
          phone: body.phone || null,
          date_of_birth: body.date_of_birth || null,
          gender: body.gender || null,
          address: body.address || null,
          city: body.city || null,
          emergency_contact_name: body.emergency_contact_name || null,
          emergency_contact_phone: body.emergency_contact_phone || null,
          medical_conditions: body.medical_conditions || null,
          allergies: body.allergies || null,
          bio: body.bio || null,
        })
        .eq('id', data.user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }
    }

    return NextResponse.json({
      user: {
        id: createdUserId,
        email: createdUserEmail
      },
      message: responseMessage,
      requiresServiceRole: !useServiceRole
    })

  } catch (error: any) {
    console.error('Error creating patient:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear paciente' },
      { status: 500 }
    )
  }
}
