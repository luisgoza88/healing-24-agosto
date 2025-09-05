import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    // Buscar citas que necesitan recordatorio de 24 horas
    const { data: appointments24h } = await supabaseClient
      .from('appointments')
      .select(`
        *,
        service:services(name),
        user:profiles!appointments_user_id_fkey(
          full_name,
          push_tokens!push_tokens_user_id_fkey(token)
        )
      `)
      .gte('appointment_date', now.toISOString())
      .lte('appointment_date', in24Hours.toISOString())
      .eq('status', 'confirmed')
      .is('notification_24h_sent', null)

    // Enviar recordatorios de 24 horas
    if (appointments24h && appointments24h.length > 0) {
      for (const appointment of appointments24h) {
        if (appointment.user?.push_tokens?.length > 0) {
          const tokens = appointment.user.push_tokens.map((pt: any) => pt.token)
          
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              to: tokens,
              title: '🏥 Recordatorio de Cita',
              body: `Tu cita de ${appointment.service.name} es mañana`,
              data: {
                type: 'appointment_reminder',
                appointmentId: appointment.id
              },
              categoryId: 'appointment_reminder'
            })
          })

          // Marcar como enviado
          await supabaseClient
            .from('appointments')
            .update({ notification_24h_sent: now.toISOString() })
            .eq('id', appointment.id)
        }
      }
    }

    // Buscar citas que necesitan recordatorio de 2 horas
    const { data: appointments2h } = await supabaseClient
      .from('appointments')
      .select(`
        *,
        service:services(name),
        user:profiles!appointments_user_id_fkey(
          full_name,
          push_tokens!push_tokens_user_id_fkey(token)
        )
      `)
      .gte('appointment_date', now.toISOString())
      .lte('appointment_date', in2Hours.toISOString())
      .eq('status', 'confirmed')
      .is('notification_2h_sent', null)

    // Enviar recordatorios de 2 horas
    if (appointments2h && appointments2h.length > 0) {
      for (const appointment of appointments2h) {
        if (appointment.user?.push_tokens?.length > 0) {
          const tokens = appointment.user.push_tokens.map((pt: any) => pt.token)
          
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              to: tokens,
              title: '🏥 Tu cita es pronto',
              body: `Tu cita de ${appointment.service.name} es en 2 horas`,
              data: {
                type: 'appointment_reminder',
                appointmentId: appointment.id
              },
              categoryId: 'appointment_reminder'
            })
          })

          // Marcar como enviado
          await supabaseClient
            .from('appointments')
            .update({ notification_2h_sent: now.toISOString() })
            .eq('id', appointment.id)
        }
      }
    }

    // Buscar clases que necesitan recordatorio
    const { data: classes2h } = await supabaseClient
      .from('classes')
      .select(`
        *,
        class_type:class_types(name),
        enrollments:class_enrollments!inner(
          user_id,
          user:profiles!class_enrollments_user_id_fkey(
            full_name,
            push_tokens!push_tokens_user_id_fkey(token)
          )
        )
      `)
      .gte('start_time', now.toISOString())
      .lte('start_time', in2Hours.toISOString())
      .eq('enrollments.status', 'enrolled')

    // Enviar recordatorios de clases
    if (classes2h && classes2h.length > 0) {
      for (const class_ of classes2h) {
        for (const enrollment of class_.enrollments) {
          if (enrollment.user?.push_tokens?.length > 0) {
            const tokens = enrollment.user.push_tokens.map((pt: any) => pt.token)
            
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                to: tokens,
                title: '🧘‍♀️ Recordatorio de Clase',
                body: `Tu clase de ${class_.class_type.name} es en 2 horas`,
                data: {
                  type: 'class_reminder',
                  classId: class_.id
                },
                categoryId: 'class_reminder'
              })
            })
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        appointments24h: appointments24h?.length || 0,
        appointments2h: appointments2h?.length || 0,
        classes2h: classes2h?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})