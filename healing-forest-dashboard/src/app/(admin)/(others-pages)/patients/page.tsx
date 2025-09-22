"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

type Profile = { id: string; full_name: string | null; email: string | null; is_staff?: boolean; first_name?: string|null; last_name?: string|null; phone?: string|null; address?: string|null; city?: string|null; country?: string|null; dob?: string|null; gender?: string|null; allergies?: string|null; medical_notes?: string|null; document_id?: string|null; emergency_contact_name?: string|null; emergency_contact_phone?: string|null };
type Booking = { id: string; start_time: string; end_time: string; status: string | null; service_name: string | null; space_id: string | null };
type BMEnrollment = { id: string; status: string | null; enrolled_at: string | null; class_id: string };
type BMClass = { id: string; class_name: string; class_date: string; start_time: string; end_time: string };
type Purchase = { id: string; package_type_id: string; status: string; classes_remaining: number | null; expiry_date: string; price_paid: number };

export default function PatientsPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [patients, setPatients] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [extendedOk, setExtendedOk] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Usa API admin (service role) para garantizar acceso a todos los pacientes existentes
      const url = new URL(window.location.origin + '/api/admin/patients');
      if (search.trim()) url.searchParams.set('q', search.trim());
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setPatients((json.data ?? []).filter((x: any) => !x?.is_staff));
      } else {
        // fallback público
        let { data } = await supabase
          .from("profiles")
          .select("*")
          .order("full_name", { ascending: true });
        setPatients((data ?? []).filter((x: any) => !x?.is_staff));
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p =>
      (p.full_name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q)
    );
  }, [patients, search]);

  async function refreshPatients() {
    const res = await fetch('/api/admin/patients', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      setPatients((json.data ?? []).filter((x: any) => !x.is_staff));
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    setPatients((data ?? []).filter((x: any) => !x.is_staff));
  }

  async function deletePatient(userId: string) {
    const ok = confirm("¿Eliminar este paciente? Esta acción no se puede deshacer.");
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/patients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshPatients();
    } catch (e: any) {
      alert(e.message || "No se pudo eliminar el paciente");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title-md font-semibold text-gray-800 dark:text-white/90">Pacientes</h1>
        <div className="flex items-center gap-2">
          <input
            placeholder="Buscar paciente por nombre o email"
            className="h-9 rounded border px-3 text-sm"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />
          <button onClick={()=>setCreating(true)} className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600">Agregar paciente</button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-0 dark:border-gray-800">
        {loading ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">Cargando…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Teléfono</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || "—"}</td>
                  <td className="px-3 py-2">{p.phone || "—"}</td>
                  <td className="px-3 py-2">{p.email || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button className="rounded border px-2 py-1 text-xs hover:bg-gray-100" onClick={()=>setSelected(p)}>Ver detalles</button>
                      <button className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50" onClick={()=>deletePatient(p.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <CreatePatientModal onClose={()=>setCreating(false)} onCreated={async ()=>{ setCreating(false); await refreshPatients(); }} />
      )}

      {selected && (
        <PatientDetailDrawer
          patient={selected}
          onClose={()=>setSelected(null)}
        />
      )}
    </div>
  );
}

function CreatePatientModal({ onClose, onCreated }:{ onClose: ()=>void; onCreated: ()=>Promise<void> }) {
  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [emgName, setEmgName] = useState("");
  const [emgPhone, setEmgPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email) return alert("Email es obligatorio");
    try {
      setLoading(true);
      const res = await fetch("/api/admin/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone,
          address,
          city,
          country,
          dob: dob || null,
          gender,
          allergies,
          medical_notes: medicalNotes,
          document_id: documentId,
          emergency_contact_name: emgName,
          emergency_contact_phone: emgPhone,
        })
      });
      if (!res.ok) throw new Error(await res.text());
      await onCreated();
    } catch (e: any) {
      alert(e.message || "No se pudo crear el paciente");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl dark:bg-gray-900 dark:text-white">
        <h3 className="mb-3 text-base font-semibold">Agregar paciente</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label>Nombre
            <input className="mt-1 w-full rounded border px-2 py-1" value={firstName} onChange={e=>setFirstName(e.target.value)}/>
          </label>
          <label>Apellido
            <input className="mt-1 w-full rounded border px-2 py-1" value={lastName} onChange={e=>setLastName(e.target.value)}/>
          </label>
          <label className="col-span-2">Nombre completo
            <input className="mt-1 w-full rounded border px-2 py-1" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="ej. Juan Pérez"/>
          </label>
          <label className="col-span-2">Email
            <input type="email" className="mt-1 w-full rounded border px-2 py-1" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ej. juan@email.com"/>
          </label>
          <label>Teléfono
            <input className="mt-1 w-full rounded border px-2 py-1" value={phone} onChange={e=>setPhone(e.target.value)}/>
          </label>
          <label>Documento
            <input className="mt-1 w-full rounded border px-2 py-1" value={documentId} onChange={e=>setDocumentId(e.target.value)}/>
          </label>
          <label className="col-span-2">Dirección
            <input className="mt-1 w-full rounded border px-2 py-1" value={address} onChange={e=>setAddress(e.target.value)}/>
          </label>
          <label>Ciudad
            <input className="mt-1 w-full rounded border px-2 py-1" value={city} onChange={e=>setCity(e.target.value)}/>
          </label>
          <label>País
            <input className="mt-1 w-full rounded border px-2 py-1" value={country} onChange={e=>setCountry(e.target.value)}/>
          </label>
          <label>Fecha nacimiento
            <input type="date" className="mt-1 w-full rounded border px-2 py-1" value={dob} onChange={e=>setDob(e.target.value)}/>
          </label>
          <label>Género
            <select className="mt-1 w-full rounded border px-2 py-1" value={gender} onChange={e=>setGender(e.target.value)}>
              <option value="">—</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label className="col-span-2">Alergias
            <input className="mt-1 w-full rounded border px-2 py-1" value={allergies} onChange={e=>setAllergies(e.target.value)} placeholder="Penicilina, lácteos…"/>
          </label>
          <label className="col-span-2">Notas médicas
            <textarea className="mt-1 w-full rounded border px-2 py-1" value={medicalNotes} onChange={e=>setMedicalNotes(e.target.value)} rows={3}/>
          </label>
          <label>Contacto emergencia (nombre)
            <input className="mt-1 w-full rounded border px-2 py-1" value={emgName} onChange={e=>setEmgName(e.target.value)}/>
          </label>
          <label>Contacto emergencia (teléfono)
            <input className="mt-1 w-full rounded border px-2 py-1" value={emgPhone} onChange={e=>setEmgPhone(e.target.value)}/>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Cancelar</button>
          <button onClick={submit} disabled={loading} className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600 disabled:opacity-50">Crear</button>
        </div>
      </div>
    </div>
  );
}

function PatientDetailDrawer({ patient, onClose }:{ patient: Profile; onClose: ()=>void }) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [enrollments, setEnrollments] = useState<(BMEnrollment & { breathe_move_classes?: BMClass })[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [txs, setTxs] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [b, e, u, t] = await Promise.all([
        supabase.from('bookings').select('id, start_time, end_time, status, service_name, space_id').eq('patient_id', patient.id).order('start_time', { ascending: false }).limit(100),
        supabase.from('breathe_move_enrollments').select('id, status, enrolled_at, class_id, breathe_move_classes:class_id(id, class_name, class_date, start_time, end_time)').eq('user_id', patient.id).order('enrolled_at', { ascending: false }).limit(100),
        supabase.from('user_package_purchases').select('id, package_type_id, status, classes_remaining, expiry_date, price_paid').eq('user_id', patient.id).order('expiry_date', { ascending: false }),
        supabase.from('package_transactions').select('*').eq('user_id', patient.id).order('created_at', { ascending: false }).limit(100),
      ]);
      setBookings(b.data ?? []);
      setEnrollments(e.data as any ?? []);
      setPurchases(u.data ?? []);
      setTxs(t.data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase, patient.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-white p-4 shadow-xl dark:bg-gray-900 dark:text-white">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Paciente</div>
            <h3 className="text-lg font-semibold">{patient.full_name || patient.email}</h3>
          </div>
          <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Cerrar</button>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Cargando…</div>
        ) : (
          <div className="space-y-6">
            <section className="rounded border p-4">
              <div className="mb-2 font-medium">Citas (servicios)</div>
              {bookings.length === 0 ? (
                <div className="text-sm text-gray-500">Sin citas</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Servicio</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} className="border-t">
                        <td className="px-3 py-2">{new Date(b.start_time).toLocaleString()}</td>
                        <td className="px-3 py-2">{b.service_name || '—'}</td>
                        <td className="px-3 py-2">{b.status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="rounded border p-4">
              <div className="mb-2 font-medium">Breathe & Move (clases)</div>
              {enrollments.length === 0 ? (
                <div className="text-sm text-gray-500">Sin clases</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Clase</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map(e => (
                      <tr key={e.id} className="border-t">
                        <td className="px-3 py-2">{e.breathe_move_classes ? `${new Date(e.breathe_move_classes.class_date).toLocaleDateString()} ${e.breathe_move_classes.start_time}` : '—'}</td>
                        <td className="px-3 py-2">{e.breathe_move_classes?.class_name || '—'}</td>
                        <td className="px-3 py-2">{e.status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="rounded border p-4">
              <div className="mb-2 font-medium">Paquetes activos</div>
              {purchases.length === 0 ? (
                <div className="text-sm text-gray-500">Sin paquetes</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-3 py-2 text-left">Clases restantes</th>
                      <th className="px-3 py-2 text-left">Vigencia</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(u => (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">{u.classes_remaining ?? '∞'}</td>
                        <td className="px-3 py-2">{new Date(u.expiry_date).toLocaleDateString()}</td>
                        <td className="px-3 py-2">{u.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="rounded border p-4">
              <div className="mb-2 font-medium">Historial de pagos/ajustes</div>
              {txs.length === 0 ? (
                <div className="text-sm text-gray-500">Sin movimientos</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Δ Clases</th>
                      <th className="px-3 py-2 text-left">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map(tx => (
                      <tr key={tx.id} className="border-t">
                        <td className="px-3 py-2">{new Date(tx.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{tx.delta}</td>
                        <td className="px-3 py-2">{tx.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
