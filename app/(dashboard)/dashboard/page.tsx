import { SessionStatus } from "@prisma/client";

import { AnalyticsRow } from "@/components/dashboard/analytics-row";
import { KpiPills } from "@/components/dashboard/kpi-pills";
import { StudentsPanel } from "@/components/dashboard/students-panel";
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

  const studentSummaries = students.map((s) => {
    const remainingHours = computeRemainingHours({
      packages: s.packages,
      sessions: s.sessions,
    });
    const consumedHours = sumConsumedHours(
      s.sessions.map((sess) => ({
        startsAt: sess.startsAt,
        endsAt: sess.endsAt,
        status: sess.status,
      })),
    );
    const totalPurchased = s.packages.reduce(
      (sum, p) => sum + Number(p.hoursPurchased),
      0,
    );
    return {
      id: s.id,
      name: s.name,
      gradeLevel: s.gradeLevel,
      colorHex: s.colorHex,
      remainingHours,
      consumedHours,
      totalPurchased,
    };
  });

  const remainingHoursTotal = studentSummaries.reduce(
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

  const topStudents = [...studentSummaries]
    .sort((a, b) => b.remainingHours - a.remainingHours)
    .slice(0, 6)
    .map((s) => ({
      name: s.name.length > 10 ? `${s.name.slice(0, 9)}…` : s.name,
      remainingHours: Number(s.remainingHours.toFixed(1)),
    }));

  return (
    <div className="mx-auto w-full max-w-[2200px] space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-card-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s a snapshot of your scheduling and student balances.
        </p>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">
          {activeStudents.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground ring-1 ring-border/40">
              Add at least one student in <strong>/students</strong> before booking
              sessions on the calendar.
            </div>
          ) : (
            <SessionCalendar students={activeStudents} />
          )}
        </div>

        <aside aria-label="Insights" className="space-y-3">
          <KpiPills
            kpi={{
              activeStudents: activeStudents.length,
              upcoming7d,
              remainingHoursTotal,
              consumedThisMonth,
            }}
            className="grid-cols-2 sm:grid-cols-2"
          />

          <AnalyticsRow
            statusSeries={statusSeries}
            next7DaysSeries={next7DaysSeries}
            topStudents={topStudents}
          />

          <StudentsPanel students={studentSummaries.slice(0, 12)} />
        </aside>
      </div>
    </div>
  );
}
