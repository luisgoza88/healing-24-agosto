import { createClient } from '@/src/lib/supabase'
import { supabaseAdmin } from '@/src/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // Verificar que el usuario actual es admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar rol de admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden crear pacientes' },
        { status: 403 }
      )
    }

    // Crear usuario SIN enviar email usando supabaseAdmin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password || 'salud',
      email_confirm: true, // Confirmar automáticamente
      user_metadata: {
        full_name: body.full_name,
        phone: body.phone,
        created_by_admin: true // Marcar que fue creado por admin
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

    return NextResponse.json({
      user: data.user,
      message: 'Paciente creado exitosamente (sin email de confirmación)'
    })

  } catch (error: any) {
    console.error('Error creating patient:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear paciente' },
      { status: 500 }
    )
  }
}