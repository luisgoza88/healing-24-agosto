"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export default function BMClassDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [cls, setCls] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enrollmentsView, setEnrollmentsView] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data: c } = await supabase.from("breathe_move_classes").select("*").eq("id", id).single();
      setCls(c);
      const { data: e } = await supabase.from("breathe_move_enrollments").select("id, user_id, created_at").eq("class_id", id);
      setEnrollments(e ?? []);
      const { data: p } = await supabase.from("profiles").select("id, full_name, email").order("full_name", { ascending: true });
      setPatients(p ?? []);

      // Mapear perfiles de inscritos
      const userIds = Array.from(new Set((e ?? []).map((x:any)=>x.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
        const map: Record<string, any> = {};
        (profs ?? []).forEach((pp:any)=>{ map[pp.id] = pp; });
        setEnrollmentsView((e ?? []).map((row:any)=> ({ ...row, profile: map[row.user_id] })));
      } else {
        setEnrollmentsView([]);
      }
    }
    load();
  }, [supabase, id]);

  if (!cls) return null;

  return (
    <div className="space-y-4">
      <div className="rounded border p-3">
        <div className="text-base font-semibold">{cls.class_name}</div>
        <div className="text-sm text-gray-500">{cls.class_date} {cls.start_time?.slice(0,5)} - {cls.end_time?.slice(0,5)}</div>
        <div className="text-sm">Cupo: {enrollmentsView.length}/{cls.max_capacity}</div>
      </div>
      <div className="rounded border p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">Inscritos</div>
          <div className="flex items-center gap-2">
            <select className="rounded border px-2 py-1 text-sm" value={selectedPatient} onChange={(e)=>setSelectedPatient(e.target.value)}>
              <option value="">Añadir paciente…</option>
              {patients.map((p)=> (
                <option key={p.id} value={p.id}>{p.full_name || p.email || p.id}</option>
              ))}
            </select>
            <button
              disabled={saving || !selectedPatient}
              onClick={async ()=>{
                try {
                  setSaving(true);
                  // Validar capacidad
                  if ((cls.current_capacity || 0) >= (cls.max_capacity || 0)) { alert('Clase llena'); setSaving(false); return; }
                  // Evitar duplicados
                  const already = enrollments.some(e=> e.user_id === selectedPatient);
                  if (already) { alert('Paciente ya inscrito'); setSaving(false); return; }
                  const { error } = await supabase.from('breathe_move_enrollments').insert({ class_id: id, user_id: selectedPatient });
                  if (error) throw error;
                  setSelectedPatient("");
                  const { data: e } = await supabase.from("breathe_move_enrollments").select("id, user_id, created_at").eq("class_id", id);
                  setEnrollments(e ?? []);
                  // refresh enrollmentsView
                  const userIds2 = Array.from(new Set((e ?? []).map((x:any)=>x.user_id).filter(Boolean)));
                  const { data: profs2 } = userIds2.length ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds2) : { data: [] } as any;
                  const map2: Record<string, any> = {};
                  (profs2 ?? []).forEach((pp:any)=>{ map2[pp.id] = pp; });
                  setEnrollmentsView((e ?? []).map((row:any)=> ({ ...row, profile: map2[row.user_id] })));
                  // refrescar clase para mostrar cupo correcto (lo actualiza el trigger en DB)
                  const { data: c2 } = await supabase.from('breathe_move_classes').select('*').eq('id', id).single();
                  if (c2) setCls(c2);
                } catch (err:any) {
                  alert(err.message || 'Error al inscribir');
                } finally { setSaving(false); }
              }}
              className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
            >
              Añadir
            </button>
          </div>
        </div>
        {enrollmentsView.length === 0 && <div className="text-xs text-gray-500">Sin inscritos</div>}
        <ul className="space-y-1 text-sm">
          {enrollmentsView.map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded border p-2">
              <span>{e.profile?.full_name || e.profile?.email || e.user_id}</span>
              <button
                className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
                onClick={async ()=>{
                  const ok = confirm('¿Eliminar de la clase?'); if (!ok) return;
                  const { error } = await supabase.from('breathe_move_enrollments').delete().eq('id', e.id);
                  if (error) { alert(error.message); return; }
                  const { data: e2 } = await supabase.from("breathe_move_enrollments").select("id, user_id, created_at").eq("class_id", id);
                  setEnrollments(e2 ?? []);
                  const userIds3 = Array.from(new Set((e2 ?? []).map((x:any)=>x.user_id).filter(Boolean)));
                  const { data: profs3 } = userIds3.length ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds3) : { data: [] } as any;
                  const map3: Record<string, any> = {};
                  (profs3 ?? []).forEach((pp:any)=>{ map3[pp.id] = pp; });
                  setEnrollmentsView((e2 ?? []).map((row:any)=> ({ ...row, profile: map3[row.user_id] })));
                  // refrescar clase (trigger en DB ajusta el cupo)
                  const { data: c3 } = await supabase.from('breathe_move_classes').select('*').eq('id', id).single();
                  if (c3) setCls(c3);
                }}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


