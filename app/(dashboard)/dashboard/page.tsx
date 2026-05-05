import { SessionStatus } from "@prisma/client";

import { DashboardOverview } from "@/components/dashboard/overview";
import { SessionCalendar } from "@/components/calendar/session-calendar";
import { computeRemainingHours, sumConsumedHours } from "@/lib/balance";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const students = await db.student.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    include: {
      packages: true,
      sessions: { where: { archivedAt: null } },
    },
  });
  const sessions = await db.session.findMany({
    where: { archivedAt: null },
    select: { status: true, startsAt: true, endsAt: true },
  });
  const activeStudents = students.map((s) => ({ id: s.id, name: s.name }));
  const remainingByStudent = students.map((s) => ({
    id: s.id,
    name: s.name,
    remainingHours: computeRemainingHours({
      packages: s.packages,
      sessions: s.sessions,
    }),
  }));
  const remainingHoursTotal = remainingByStudent.reduce(
    (sum, s) => sum + s.remainingHours,
    0,
  );
  const upcoming7d = sessions.filter(
    (s) =>
      s.startsAt >= now &&
      s.startsAt < in7d &&
      s.status !== "CANCELLED_BY_STUDENT" &&
      s.status !== "CANCELLED_BY_TUTOR",
  ).length;
  const consumedThisMonth = sumConsumedHours(
    sessions
      .filter((s) => s.startsAt >= monthStart && s.startsAt < monthEnd)
      .map((s) => ({
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        status: s.status,
      })),
  );
  const statusOrder: SessionStatus[] = [
    "SCHEDULED",
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED_BY_TUTOR",
    "CANCELLED_BY_STUDENT",
  ];
  const statusSeries = statusOrder.map((status) => ({
    name: status,
    value: sessions.filter((s) => s.status === status).length,
  }));
  const next7DaysSeries = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i,
      0,
      0,
      0,
      0,
    );
    const dayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i + 1,
      0,
      0,
      0,
      0,
    );
    return {
      day: dayStart.toLocaleDateString(undefined, { weekday: "short" }),
      sessions: sessions.filter(
        (s) =>
          s.startsAt >= dayStart &&
          s.startsAt < dayEnd &&
          s.status !== "CANCELLED_BY_STUDENT" &&
          s.status !== "CANCELLED_BY_TUTOR",
      ).length,
    };
  });

  return (
    <div className="mx-auto w-full max-w-[2200px]">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div>
          {activeStudents.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-sm text-muted-foreground">
              Add at least one student in <strong>/students</strong> before booking
              sessions on the calendar.
            </div>
          ) : (
            <SessionCalendar students={activeStudents} />
          )}
        </div>
        <DashboardOverview
          kpi={{
            activeStudents: activeStudents.length,
            upcoming7d,
            remainingHoursTotal,
            consumedThisMonth,
          }}
          statusSeries={statusSeries}
          next7DaysSeries={next7DaysSeries}
          studentRail={remainingByStudent.slice(0, 8)}
        />
      </div>
    </div>
  );
}
