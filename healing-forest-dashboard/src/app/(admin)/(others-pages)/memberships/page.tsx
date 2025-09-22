"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

type Profile = { id: string; full_name: string | null; email: string | null };
type PackageType = { id: string; name: string; classes_included: number | null; duration_days: number; price: number; color: string | null; service_code?: string };
type Purchase = { id: string; user_id: string; package_type_id: string; classes_remaining: number | null; expiry_date: string; status: string; price_paid: number };

export default function MembershipsPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [patients, setPatients] = useState<Profile[]>([]);
  const [pkgTypes, setPkgTypes] = useState<PackageType[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [assignUser, setAssignUser] = useState<string>("");
  const [assignPkg, setAssignPkg] = useState<string>("");
  // const [assignPrice, setAssignPrice] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PackageType | null>(null);
  const [adjustUser, setAdjustUser] = useState<Profile | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [txs, setTxs] = useState<any[]>([]);
  const [openPatients, setOpenPatients] = useState(false);
  const [openPackages, setOpenPackages] = useState(true);
  const [openHistory, setOpenHistory] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Leer usando API admin para evitar RLS
      const [patientsRes, pkRes] = await Promise.all([
        fetch('/api/admin/patients', { cache: 'no-store' }),
        fetch('/api/admin/packages', { cache: 'no-store' }),
      ]);
      if (patientsRes.ok) {
        const pj = await patientsRes.json();
        setPatients((pj.data ?? []).filter((x: any) => !x.is_staff));
      }
      if (pkRes.ok) {
        const kj = await pkRes.json();
        setPkgTypes(kj.types ?? []);
        setPurchases(kj.purchases ?? []);
        setTxs(kj.transactions ?? []);
      } else {
        // Fallback público si no hay SRK o falla la API
        const [t, u, tx] = await Promise.all([
          supabase.from('package_types').select('id, name, classes_included, duration_days, price, color, service_code, is_active').order('name'),
          supabase.from('user_package_purchases').select('*').order('expiry_date', { ascending: true }),
          supabase.from('package_transactions').select('*').order('created_at', { ascending: false }).limit(100),
        ]);
        setPkgTypes(t.data ?? []);
        setPurchases(u.data ?? []);
        setTxs(tx.data ?? []);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const purchasesByUser: Record<string, Purchase[]> = useMemo(() => {
    const map: Record<string, Purchase[]> = {};
    for (const pur of purchases) {
      (map[pur.user_id] ||= []).push(pur);
    }
    return map;
  }, [purchases]);

  async function assign() {
    if (!assignUser || !assignPkg) return;
    const pkg = pkgTypes.find(p => p.id === assignPkg);
    const price = pkg?.price ?? 0;
    const { error } = await supabase.rpc('assign_package', { p_user_id: assignUser, p_package_type_id: assignPkg, p_price: price });
    if (error) { alert(error.message); return; }
    setAssignUser(""); setAssignPkg("");
    const pkRes = await fetch('/api/admin/packages', { cache: 'no-store' });
    if (pkRes.ok) {
      const kj = await pkRes.json();
      setPurchases(kj.purchases ?? []);
      setTxs(kj.transactions ?? []);
    }
  }

  async function createOrUpdatePackage(values: Partial<PackageType> & { id?: string }) {
    if (!values.name || !values.duration_days || values.price === undefined) return alert('Completa nombre, vigencia y precio');
    if (values.id) {
      // Bloquear edición de nombre para mantener compatibilidad con la app móvil
      const { error } = await supabase.from('package_types').update({
        classes_included: values.classes_included ?? null,
        duration_days: values.duration_days,
        price: values.price,
        color: values.color ?? null,
        service_code: values.service_code ?? 'breathe_move',
      }).eq('id', values.id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from('package_types').insert({
        name: values.name,
        classes_included: values.classes_included ?? null,
        duration_days: values.duration_days,
        price: values.price,
        color: values.color ?? null,
        service_code: values.service_code ?? 'breathe_move',
        is_active: true,
      });
      if (error) return alert(error.message);
    }
    setCreating(false); setEditing(null);
    const { data } = await supabase.from('package_types').select('id, name, classes_included, duration_days, price, color, service_code, is_active').order('name');
    setPkgTypes(data ?? []);
  }

  async function setPackageActive(id: string, active: boolean) {
    const { error } = await supabase.from('package_types').update({ is_active: active }).eq('id', id);
    if (error) return alert(error.message);
    const pkRes = await fetch('/api/admin/packages', { cache: 'no-store' });
    if (pkRes.ok) {
      const kj = await pkRes.json();
      setPkgTypes(kj.types ?? []);
    }
  }

  // Ajuste de paquetes del paciente
  function openAdjustModal(user: Profile) {
    setAdjustUser(user);
    setShowAdjust(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-title-md font-semibold text-gray-800 dark:text-white/90">Membresías y Paquetes</h1>
      <div className="rounded border p-4">
        <div className="mb-3 font-medium">Asignar paquete</div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded border px-2 py-1 text-sm" value={assignUser} onChange={(e)=>setAssignUser(e.target.value)}>
            <option value="">Paciente…</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || p.email || p.id}</option>
            ))}
          </select>
          <select className="rounded border px-2 py-1 text-sm" value={assignPkg} onChange={(e)=>setAssignPkg(e.target.value)}>
            <option value="">Paquete…</option>
            {pkgTypes.map(pt => (
              <option key={pt.id} value={pt.id}>{pt.name} ({pt.classes_included ?? '∞'} / {pt.duration_days}d)</option>
            ))}
          </select>
          <button onClick={assign} className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600">Asignar</button>
        </div>
      </div>

      <div className="rounded border">
        <button className="flex w-full items-center justify-between p-4" onClick={()=>setOpenPatients(v=>!v)} aria-expanded={openPatients}>
          <span className="font-medium">Pacientes</span>
          <span className="text-xs text-gray-500">{openPatients ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {openPatients && (
          <div className="px-4 pb-4">
            {loading ? (
              <div className="text-sm text-gray-500">Cargando…</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-3 py-2 text-left">Paciente</th>
                    <th className="px-3 py-2 text-left">Paquetes activos</th>
                    <th className="px-3 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p)=>{
                    const ups = (purchasesByUser[p.id] || []).filter(x => x.status === 'active');
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2">{p.full_name || p.email}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {ups.length === 0 && <span className="text-gray-500">—</span>}
                            {ups.map(up => {
                              const pt = pkgTypes.find(t => t.id === up.package_type_id);
                              return (
                                <span key={up.id} className="inline-flex items-center gap-1 rounded border px-2 py-0.5">
                                  {pt?.name || 'Paquete'} · {up.classes_remaining ?? '∞'} restantes · expira {new Date(up.expiry_date).toLocaleDateString()}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <button className="rounded border px-2 py-1 text-xs hover:bg-gray-100" onClick={()=>openAdjustModal(p)}>Ajustar</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Gestión de Paquetes */}
      <div id="packages" className="rounded border">
        <div className="flex items-center justify-between p-4">
          <span className="font-medium">Paquetes</span>
          <div className="flex items-center gap-3">
            <button className="text-xs text-gray-500 hover:underline" onClick={()=>setOpenPackages(v=>!v)} aria-expanded={openPackages}>{openPackages ? 'Ocultar' : 'Mostrar'}</button>
            <button className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600" onClick={()=>setCreating(true)}>Crear paquete</button>
          </div>
        </div>
        {openPackages && (
          <div className="px-4 pb-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Servicio</th>
                  <th className="px-3 py-2 text-left">Clases</th>
                  <th className="px-3 py-2 text-left">Vigencia</th>
                  <th className="px-3 py-2 text-left">Precio</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pkgTypes.map(pt => (
                  <tr key={pt.id} className="border-t">
                    <td className="px-3 py-2">{pt.name}</td>
                    <td className="px-3 py-2">{pt.service_code || 'breathe_move'}</td>
                    <td className="px-3 py-2">{pt.classes_included ?? '∞'}</td>
                    <td className="px-3 py-2">{pt.duration_days} días</td>
                    <td className="px-3 py-2">{pt.price.toLocaleString('es-CO')}</td>
                    <td className="px-3 py-2">{pt.is_active ? 'Activo' : 'Inactivo'}</td>
                    <td className="px-3 py-2">
                      <button className="rounded border px-2 py-1 text-xs hover:bg-gray-100 mr-2" onClick={()=>setEditing(pt)}>Editar</button>
                      {pt.is_active ? (
                        <button className="rounded border px-2 py-1 text-xs hover:bg-gray-100" onClick={()=>setPackageActive(pt.id, false)}>Desactivar</button>
                      ) : (
                        <button className="rounded border px-2 py-1 text-xs hover:bg-gray-100" onClick={()=>setPackageActive(pt.id, true)}>Activar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de movimientos */}
      <div className="rounded border">
        <button className="flex w-full items-center justify-between p-4" onClick={()=>setOpenHistory(v=>!v)} aria-expanded={openHistory}>
          <span className="font-medium">Historial de ajustes y consumos</span>
          <span className="text-xs text-gray-500">{openHistory ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {openHistory && (
          <div className="px-4 pb-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Usuario</th>
                  <th className="px-3 py-2 text-left">Δ Clases</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(tx => (
                  <tr key={tx.id} className="border-t">
                    <td className="px-3 py-2">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{tx.user_id}</td>
                    <td className="px-3 py-2">{tx.delta}</td>
                    <td className="px-3 py-2">{tx.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar Paquete */}
      {(creating || editing) && (
        <PackageModal
          initial={editing || undefined}
          onClose={()=>{ setCreating(false); setEditing(null); }}
          onSave={createOrUpdatePackage}
        />
      )}

      {/* Modal Ajustar Paquete del Paciente */}
      {showAdjust && adjustUser && (
        <AdjustModal
          user={adjustUser}
          purchases={(purchasesByUser[adjustUser.id] || []).filter(x=>x.status==='active')}
          onClose={()=>{ setShowAdjust(false); setAdjustUser(null); }}
          onReload={async ()=>{
            const pkRes = await fetch('/api/admin/packages', { cache: 'no-store' });
            if (pkRes.ok) {
              const kj = await pkRes.json();
              setPurchases(kj.purchases ?? []);
              setTxs(kj.transactions ?? []);
            }
          }}
        />
      )}
    </div>
  );
}

// ---- Modales auxiliares ----
function PackageModal({ initial, onClose, onSave }: { initial?: PackageType; onClose: ()=>void; onSave: (v: Partial<PackageType>&{id?:string})=>Promise<void> }) {
  const [form, setForm] = useState<Partial<PackageType>>({
    name: initial?.name ?? '',
    classes_included: initial?.classes_included ?? 0,
    duration_days: initial?.duration_days ?? 30,
    price: initial?.price ?? 0,
    color: initial?.color ?? '#4CAF50',
    service_code: initial?.service_code ?? 'breathe_move',
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl dark:bg-gray-900 dark:text-white">
        <h3 className="mb-3 text-base font-semibold">{initial ? 'Editar paquete' : 'Crear paquete'}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="col-span-2">Nombre
            <input className="mt-1 w-full rounded border px-2 py-1" value={form.name as any} onChange={e=>setForm({...form, name: e.target.value})} disabled={!!initial}/>
            {initial && <span className="mt-1 block text-xs text-gray-500">El nombre está bloqueado para evitar duplicados y mantener compatibilidad.</span>}
          </label>
          <label>Clases (vacío=∞)
            <input type="number" className="mt-1 w-full rounded border px-2 py-1" value={(form.classes_included ?? '') as any} onChange={e=>setForm({...form, classes_included: e.target.value === '' ? null : Number(e.target.value)})}/>
          </label>
          <label>Vigencia (días)
            <input type="number" className="mt-1 w-full rounded border px-2 py-1" value={form.duration_days as any} onChange={e=>setForm({...form, duration_days: Number(e.target.value)})}/>
          </label>
          <label>Precio
            <input type="number" className="mt-1 w-full rounded border px-2 py-1" value={form.price as any} onChange={e=>setForm({...form, price: Number(e.target.value)})}/>
          </label>
          <label>Color
            <input type="color" className="mt-1 h-9 w-full rounded border px-2 py-1" value={form.color as any} onChange={e=>setForm({...form, color: e.target.value})}/>
          </label>
          <label className="col-span-2">Servicio
            <select className="mt-1 w-full rounded border px-2 py-1" value={form.service_code} onChange={e=>setForm({...form, service_code: e.target.value})}>
              <option value="breathe_move">Breathe & Move</option>
              <option value="sueros">Sueros</option>
              <option value="hiperbarica">Cámara Hiperbárica</option>
              <option value="otros">Otros</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Cancelar</button>
          <button onClick={()=>onSave(initial ? {...form, id: initial.id} : form)} className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600">Guardar</button>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({ user, purchases, onClose, onReload }:{ user: Profile; purchases: Purchase[]; onClose:()=>void; onReload:()=>Promise<void> }) {
  const supabase = getSupabaseBrowser();
  const [purchaseId, setPurchaseId] = useState<string>(purchases[0]?.id ?? '');
  const [reason, setReason] = useState<string>('manual_adjust');
  const [loading, setLoading] = useState(false);
  const [desiredRemaining, setDesiredRemaining] = useState<string>('');

  async function saveAdjust() {
    try {
      setLoading(true);
      const selected = purchases.find(p=>p.id === purchaseId);
      if (!selected) throw new Error('Selecciona una compra.');
      if (desiredRemaining === '') throw new Error('Ingresa el número de clases restantes.');
      const desired = Number(desiredRemaining);
      const current = selected.classes_remaining ?? 0;
      const deltaToApply = desired - current;
      if (deltaToApply !== 0) {
        const { error } = await supabase.rpc('adjust_classes', { p_purchase_id: purchaseId, p_delta: deltaToApply, p_reason: reason });
        if (error) throw error;
      }
      await onReload();
      onClose();
    } catch (e:any) { alert(e.message); } finally { setLoading(false); }
  }

  async function cancelPackage() {
    const ok = confirm('¿Cancelar este paquete?');
    if (!ok) return;
    const { error } = await supabase.from('user_package_purchases').update({ status: 'cancelled' }).eq('id', purchaseId);
    if (error) return alert(error.message);
    await onReload();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl dark:bg-gray-900 dark:text-white">
        <h3 className="mb-3 text-base font-semibold">Ajustar paquete — {user.full_name || user.email}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="col-span-2">Compra
            <select className="mt-1 w-full rounded border px-2 py-1" value={purchaseId} onChange={e=>setPurchaseId(e.target.value)}>
              {purchases.map(p=> (
                <option key={p.id} value={p.id}>{p.id.slice(0,8)} · rest: {p.classes_remaining ?? '∞'} · exp: {new Date(p.expiry_date).toLocaleDateString()}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2">Número de clases restantes
            <input type="number" className="mt-1 w-full rounded border px-2 py-1" value={desiredRemaining} onChange={e=>setDesiredRemaining(e.target.value)} placeholder="ej. 7"/>
          </label>
          <label>Motivo
            <input className="mt-1 w-full rounded border px-2 py-1" value={reason} onChange={e=>setReason(e.target.value)}/>
          </label>
        </div>
        <div className="mt-4 flex justify-between">
          <button onClick={cancelPackage} className="rounded border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Eliminar paquete</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Cancelar</button>
            <button onClick={saveAdjust} disabled={loading} className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600 disabled:opacity-50">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// (Nota) Se eliminó un export duplicado que causaba error
