import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canUserModifyAppointment } from '@/lib/auth/permissions'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    // Verificar permisos
    const canModify = await canUserModifyAppointment(params.id)
    if (!canModify) {
      return NextResponse.json(
        { error: 'No tienes permisos para cancelar esta cita' }, 
        { status: 403 }
      )
    }
    
    // Verificar que la cita existe y es del usuario
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (!appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }
    
    // Verificar política de cancelación (24 horas antes)
    const appointmentDate = new Date(appointment.date)
    const now = new Date()
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntilAppointment < 24) {
      return NextResponse.json(
        { error: 'Las citas deben cancelarse con al menos 24 horas de anticipación' },
        { status: 400 }
      )
    }
    
    // Actualizar estado de la cita
    const { error } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id
      })
      .eq('id', params.id)
    
    if (error) throw error
    
    // Crear notificación para el usuario
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Cita cancelada',
        message: `Tu cita del ${appointmentDate.toLocaleDateString()} ha sido cancelada`,
        type: 'appointment_cancelled'
      })
    
    return NextResponse.json({ 
      success: true,
      message: 'Cita cancelada exitosamente' 
    })
    
  } catch (error) {
    console.error('Error cancelando cita:', error)
    return NextResponse.json(
      { error: 'Error al cancelar la cita' },
      { status: 500 }
    )
  }
}