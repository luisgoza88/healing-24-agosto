import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function supabaseAdmin(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
    headers: { get: (k) => req.headers.get(k) ?? undefined },
  });
}

export async function GET(req: NextRequest) {
  try {
    const sb = supabaseAdmin(req);
    const { data, error } = await sb.from('professionals').select('*').order('full_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'error' }, { status: 500 });
  }
}


