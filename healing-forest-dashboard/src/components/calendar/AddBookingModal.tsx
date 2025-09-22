"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

type Space = { id: string; name: string; capacity: number };

type Patient = { id: string; full_name: string | null; email: string | null };
type Professional = { id: string; full_name: string | null };

type Props = {
  space: Space;
  open: boolean;
  onClose: () => void;
};

export default function AddBookingModal({ space, open, onClose }: Props) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pros, setPros] = useState<Professional[]>([]);
  const [patientId, setPatientId] = useState<string>("");
  const [professionalId, setProfessionalId] = useState<string>("");
  const [attendees, setAttendees] = useState<number>(1);
  const [start, setStart] = useState<string>(new Date().toISOString().slice(0, 16));
  const [end, setEnd] = useState<string>(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const [pRes, prRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").order("full_name", { ascending: true }),
        supabase.from("professionals").select("id, full_name").order("full_name", { ascending: true }),
      ]);
      setPatients(pRes.data ?? []);
      setPros(prRes.data ?? []);
    }
    load();
  }, [supabase, open]);

  async function create() {
    setError(null);
    setLoading(true);
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (!(startDate < endDate)) throw new Error("Rango horario inválido");
      if (!patientId) throw new Error("Selecciona un paciente");

      // Validar capacidad
      const { data: overlaps } = await supabase
        .from("bookings")
        .select("attendees,start_time,end_time")
        .eq("space_id", space.id)
        .or(`and(start_time.lt.${endDate.toISOString()},end_time.gt.${startDate.toISOString()})`);
      const used = (overlaps ?? []).reduce((s, b) => s + (b.attendees || 1), 0);
      if (used + attendees > space.capacity) throw new Error("Capacidad insuficiente para ese horario");

      const { error: insErr } = await supabase.from("bookings").insert({
        space_id: space.id,
        patient_id: patientId,
        professional_id: professionalId || null,
        attendees,
        service_name: space.name,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: "confirmed",
      });
      if (insErr) throw insErr;
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Error al crear");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl dark:bg-gray-900 dark:text-white">
        <h3 className="mb-3 text-base font-semibold">Agregar nueva cita — {space.name}</h3>
        {error && <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>}
        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm">
            Paciente
            <select className="mt-1 w-full rounded border px-2 py-1 text-sm" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecciona…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email || p.id}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Profesional (opcional)
            <select className="mt-1 w-full rounded border px-2 py-1 text-sm" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              <option value="">—</option>
              {pros.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.full_name || pr.id}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              Inicio
              <input type="datetime-local" className="mt-1 w-full rounded border px-2 py-1 text-sm" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="text-sm">
              Fin
              <input type="datetime-local" className="mt-1 w-full rounded border px-2 py-1 text-sm" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <label className="text-sm">
            Asistentes
            <input type="number" min={1} max={space.capacity} value={attendees} onChange={(e) => setAttendees(Number(e.target.value))} className="mt-1 w-24 rounded border px-2 py-1 text-sm" />
            <span className="ml-2 text-xs text-gray-500">cap {space.capacity}</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Cancelar</button>
          <button onClick={create} disabled={loading} className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600 disabled:opacity-50">
            {loading ? "Guardando…" : "Crear cita"}
          </button>
        </div>
      </div>
    </div>
  );
}
