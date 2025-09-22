"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import Link from "next/link";

type Space = { id: string; name: string; type: string; capacity: number; color: string | null; active: boolean };
type Booking = { id: string; space_id: string; patient_id: string | null; service_name: string | null; start_time: string; end_time: string; attendees: number; status: string };

export default function MultiResourceCalendar() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [spRes, bkRes] = await Promise.all([
          supabase.from("spaces").select("id,name,type,capacity,color,active").eq("active", true),
          supabase.from("bookings").select("id,space_id,patient_id,service_name,start_time,end_time,attendees,status").gte("start_time", new Date(Date.now() - 7*24*3600*1000).toISOString()),
        ]);
        if (spRes.error) throw spRes.error;
        if (bkRes.error) throw bkRes.error;
        if (!isMounted) return;
        setSpaces(spRes.data ?? []);
        setBookings(bkRes.data ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Error cargando calendario");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();

    // Realtime bookings
    const channel = supabase.channel("bookings-rt").on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      (payload) => {
        setBookings((prev) => {
          const next = [...prev];
          if (payload.eventType === "INSERT") {
            next.push(payload.new as any);
          } else if (payload.eventType === "UPDATE") {
            const idx = next.findIndex((b) => b.id === (payload.new as any).id);
            if (idx >= 0) next[idx] = payload.new as any;
          } else if (payload.eventType === "DELETE") {
            return next.filter((b) => b.id !== (payload.old as any).id);
          }
          return next;
        });
      }
    ).subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Mantener el orden de hooks estable entre renders: declarar hooks antes de cualquier return condicional
  const bookingsBySpace: Record<string, Booking[]> = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      if (!map[b.space_id]) map[b.space_id] = [];
      map[b.space_id].push(b);
    }
    return map;
  }, [bookings]);

  if (loading) return <div className="text-sm text-gray-500">Cargando calendario…</div>;
  if (error) return <div className="text-sm text-error-500">{error}</div>;

  // Helpers para crear y cancelar reservas
  async function createBooking(space: Space) {
    const now = new Date();
    const start = new Date(now.getTime() + 15 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    // Validación de capacidad actual
    const overlapping = bookings.filter(
      (b) =>
        b.space_id === space.id &&
        !(new Date(b.end_time) <= start || new Date(b.start_time) >= end)
    );
    const used = overlapping.reduce((sum, b) => sum + (b.attendees || 1), 0);
    if (used + 1 > space.capacity) {
      alert(`Capacidad llena en ${space.name}. (${used}/${space.capacity})`);
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      space_id: space.id,
      attendees: 1,
      service_name: "Reserva rápida",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "confirmed",
    });
    if (error) alert(`Error al crear: ${error.message}`);
  }

  async function cancelBooking(id: string) {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) alert(`Error al cancelar: ${error.message}`);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {spaces.map((s) => {
        const spaceBookings = (bookingsBySpace[s.id] ?? []).sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        );
        const totalAttendees = spaceBookings.reduce(
          (sum, b) => sum + (b.attendees || 1),
          0
        );
        return (
          <div
            key={s.id}
            className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: s.color ?? undefined }}
            >
              <div>
                <h3 className="font-semibold text-white/90">{s.name}</h3>
                <p className="text-xs text-white/80">
                  Capacidad: {totalAttendees}/{s.capacity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => createBooking(s)}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md"
                >
                  Nueva reserva
                </button>
                <Link
                  href={`/appointments/space/${s.id}`}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md"
                >
                  Ver calendario
                </Link>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {spaceBookings.length === 0 && (
                <p className="text-xs text-gray-500">Sin reservas próximas</p>
              )}
              {spaceBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-800 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {b.service_name ?? "Servicio"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(b.start_time).toLocaleString()} -
                      {" "}
                      {new Date(b.end_time).toLocaleTimeString()} · {b.attendees}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{b.status}</span>
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}


