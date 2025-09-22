"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

type Space = { id: string; name: string; capacity: number; color: string | null; active: boolean };
type Booking = { id: string; space_id: string; start_time: string; end_time: string; attendees: number };

type Props = { date?: Date };

export default function CapacityCalendar({ date }: Props) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [viewDate, setViewDate] = useState<Date>(date ?? new Date());

  useEffect(() => {
    async function load() {
      const start = new Date(viewDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const [spRes, bkRes] = await Promise.all([
        supabase.from("spaces").select("id,name,capacity,color,active").eq("active", true),
        supabase
          .from("bookings")
          .select("id,space_id,start_time,end_time,attendees")
          .gte("start_time", start.toISOString())
          .lt("start_time", end.toISOString()),
      ]);
      setSpaces(spRes.data ?? []);
      setBookings(bkRes.data ?? []);
    }
    load();
  }, [supabase, viewDate]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  function bucketCount(spaceId: string, hour: number) {
    const start = new Date(viewDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, 0, 0, 0);
    return bookings
      .filter(
        (b) =>
          b.space_id === spaceId &&
          !(new Date(b.end_time) <= start || new Date(b.start_time) >= end)
      )
      .reduce((sum, b) => sum + (b.attendees || 1), 0);
  }

  async function quickCreate(space: Space, hour: number) {
    const start = new Date(viewDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 60);
    const used = bucketCount(space.id, hour);
    if (used + 1 > space.capacity) return alert("Capacidad completa para este horario");
    const { error } = await supabase.from("bookings").insert({
      space_id: space.id,
      attendees: 1,
      service_name: "Reserva",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "confirmed",
    });
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={new Date(viewDate).toISOString().slice(0, 10)}
          onChange={(e) => setViewDate(new Date(e.target.value))}
          className="border px-2 py-1 rounded-md text-sm"
        />
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-xs border border-gray-200 dark:border-gray-800">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="px-3 py-2 text-left">Espacio</th>
              {hours.map((h) => (
                <th key={h} className="px-2 py-2 text-center w-16">
                  {h}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spaces.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 whitespace-nowrap font-medium" style={{ color: s.color ?? undefined }}>
                  {s.name} <span className="text-gray-400">(cap {s.capacity})</span>
                </td>
                {hours.map((h) => {
                  const used = bucketCount(s.id, h);
                  const full = used >= s.capacity;
                  return (
                    <td key={h} className="px-1 py-1 text-center">
                      <button
                        onClick={() => quickCreate(s, h)}
                        className={`w-14 py-1 rounded-md border text-[11px] ${
                          full
                            ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300"
                            : used > 0
                            ? "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300"
                            : "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300"
                        }`}
                        title={`${used}/${s.capacity}`}
                      >
                        {used}/{s.capacity}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
