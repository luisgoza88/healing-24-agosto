import MultiResourceCalendar from "@/components/calendar/MultiResourceCalendar";

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-title-md font-semibold text-gray-800 dark:text-white/90">Citas</h1>
      </div>
      <MultiResourceCalendar />
    </div>
  );
}


