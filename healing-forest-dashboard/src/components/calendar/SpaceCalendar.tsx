"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import AddBookingModal from "./AddBookingModal";

type Booking = { id: string; start_time: string; end_time: string; attendees: number; service_name: string | null };

type Props = { spaceId: string };

export default function SpaceCalendar({ spaceId }: Props) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [events, setEvents] = useState<any[]>([]);
  const [space, setSpace] = useState<{ id: string; name: string; capacity: number } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const sp = await supabase.from("spaces").select("id,name,capacity").eq("id", spaceId).single();
      setSpace(sp.data ?? null);
      const { data } = await supabase
        .from("bookings")
        .select("id,start_time,end_time,attendees,service_name")
        .eq("space_id", spaceId);
      setEvents(
        (data ?? []).map((b: Booking) => ({
          id: b.id,
          title: `${b.service_name ?? "Reserva"} (${b.attendees})`,
          start: b.start_time,
          end: b.end_time,
        }))
      );
    }
    load();

    const ch = supabase
      .channel(`bookings-${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `space_id=eq.${spaceId}` }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [supabase, spaceId]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">{space?.name}</div>
        {space && (
          <button onClick={() => setOpen(true)} className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600">
            Agregar nueva cita
          </button>
        )}
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
        events={events}
        height="auto"
      />
      {space && (
        <AddBookingModal space={space} open={open} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
