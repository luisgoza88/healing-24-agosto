import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function supabaseAdmin(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
    headers: {
      get: (k) => req.headers.get(k) ?? undefined,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, full_name, first_name, last_name, phone, address, city, country, dob, gender, allergies, medical_notes, document_id, emergency_contact_name, emergency_contact_phone } = body;
    if (!email) return NextResponse.json({ error: "email requerido" }, { status: 400 });
    const sb = supabaseAdmin(req);
    // Crear usuario si no existe (auth) y perfil
    const { data: user, error: authErr } = await (sb as any).auth.admin.createUser({ email, email_confirm: true });
    if (authErr && !String(authErr.message).includes('already registered')) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }
    const userId = user?.user?.id ?? null;
    if (userId) {
      await sb.from('profiles').upsert({ id: userId, email, full_name, first_name, last_name, phone, address, city, country, dob, gender, allergies, medical_notes, document_id, emergency_contact_name, emergency_contact_phone }, { onConflict: 'id' });
    } else {
      // Si ya existía, asegurar perfil por email
      const { data: existing } = await sb.from('profiles').select('id').eq('email', email).maybeSingle();
      if (!existing) await sb.from('profiles').insert({ email, full_name, first_name, last_name, phone, address, city, country, dob, gender, allergies, medical_notes, document_id, emergency_contact_name, emergency_contact_phone });
    }
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 });
    const sb = supabaseAdmin(req);
    // Borrar perfil (y opcional: auth)
    await sb.from('profiles').delete().eq('id', user_id);
    try { await (sb as any).auth.admin.deleteUser(user_id); } catch {}
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const sb = supabaseAdmin(req);
    let query = sb.from('profiles').select('*').neq('is_staff', true).order('full_name');
    if (q && q.trim() !== '') {
      // filtrar por nombre o email (case-insensitive)
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'error' }, { status: 500 });
  }
}


