import { SessionCalendar } from "@/components/calendar/session-calendar";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const students = await db.student.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-6xl">
      {students.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-sm text-muted-foreground">
          Add at least one student in <strong>/students</strong> before booking
          sessions on the calendar.
        </div>
      ) : (
        <SessionCalendar students={students} />
      )}
    </div>
  );
}
