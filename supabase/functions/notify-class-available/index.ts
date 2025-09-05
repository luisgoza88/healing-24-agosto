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

    const { classId } = await req.json()

    // Obtener información de la clase
    const { data: classData } = await supabaseClient
      .from('classes')
      .select(`
        *,
        class_type:class_types(name, icon)
      `)
      .eq('id', classId)
      .single()

    if (!classData) {
      return new Response(
        JSON.stringify({ error: 'Class not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar si hay cupos disponibles
    if (classData.current_capacity >= classData.max_capacity) {
      return new Response(
        JSON.stringify({ error: 'Class is still full' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener usuarios en lista de espera
    const { data: waitlistUsers } = await supabaseClient
      .from('class_waitlist')
      .select(`
        *,
        push_tokens!inner(token)
      `)
      .eq('class_id', classId)
      .order('position', { ascending: true })
      .limit(3) // Notificar a los primeros 3 en la lista

    if (!waitlistUsers || waitlistUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users in waitlist' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enviar notificaciones a usuarios en lista de espera
    for (const user of waitlistUsers) {
      const tokens = user.push_tokens.map((pt: any) => pt.token)
      
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          to: tokens,
          title: `${classData.class_type.icon} ¡Cupo disponible!`,
          body: `Se liberó un cupo en ${classData.class_type.name}. ¡Inscríbete ahora!`,
          data: {
            type: 'class_available',
            classId: classId
          },
          categoryId: 'class_available'
        })
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notified: waitlistUsers.length
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