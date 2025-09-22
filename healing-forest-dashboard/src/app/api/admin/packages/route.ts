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
    let { data: tdata, error: terror } = await sb.from('package_types').select('*').order('name');
    const [purchases, txs] = await Promise.all([
      sb.from('user_package_purchases').select('*').order('expiry_date'),
      sb.from('package_transactions').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    if (terror) return NextResponse.json({ error: terror.message }, { status: 400 });
    if (purchases.error) return NextResponse.json({ error: purchases.error.message }, { status: 400 });
    if (txs.error) return NextResponse.json({ error: txs.error.message }, { status: 400 });
    // Si no hay types, intenta seed para mantener sincronía con móvil
    if (!tdata || tdata.length === 0) {
      const defaults = [
        { name: '1 Clase', classes_included: 1, duration_days: 30, price: 50000, color: '#4CAF50', is_active: true, service_code: 'breathe_move' },
        { name: '4 Clases', classes_included: 4, duration_days: 60, price: 180000, color: '#4CAF50', is_active: true, service_code: 'breathe_move' },
        { name: '8 Clases', classes_included: 8, duration_days: 90, price: 320000, color: '#4CAF50', is_active: true, service_code: 'breathe_move' },
        { name: 'Mensualidad', classes_included: null, duration_days: 30, price: 220000, color: '#4CAF50', is_active: true, service_code: 'breathe_move' },
        { name: 'Bimestral', classes_included: null, duration_days: 60, price: 400000, color: '#4CAF50', is_active: true, service_code: 'breathe_move' },
        { name: 'Trimestre', classes_included: null, duration_days: 90, price: 560000, color: '#4CAF50', is_active: true, service_code: 'breathe_move' },
        { name: 'Semestral', classes_included: null, duration_days: 180, price: 980000, color: '#4CAF50', is_active: true, service_code: 'breathe_move' },
        { name: 'Anual', classes_included: null, duration_days: 365, price: 1700000, color: '#4CAF50', is_active: true, service_code: 'breathe_move' },
      ];
      await sb.from('package_types').upsert(defaults, { onConflict: 'name' });
      const { data: types2 } = await sb.from('package_types').select('*').order('name');
      tdata = types2 ?? [];
    }
    return NextResponse.json({ types: tdata, purchases: purchases.data, transactions: txs.data });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'error' }, { status: 500 });
  }
}


