"use client";
import { useParams } from "next/navigation";
import SpaceCalendar from "@/components/calendar/SpaceCalendar";

export default function SpaceCalendarPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  if (!id) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-title-md font-semibold text-gray-800 dark:text-white/90">Calendario del espacio</h1>
      <SpaceCalendar spaceId={id} />
    </div>
  );
}


