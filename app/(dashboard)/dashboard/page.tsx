import { SessionStatus } from "@prisma/client";

import { AnalyticsRow } from "@/components/dashboard/analytics-row";
import { KpiPills } from "@/components/dashboard/kpi-pills";
import { StudentsPanel } from "@/components/dashboard/students-panel";
import { SessionCalendar } from "@/components/calendar/session-calendar";
import { computeRemainingHours, sumConsumedHours } from "@/lib/balance";
import { db } from "@/lib/db";
import { copy } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function DashboardPage() {
  const locale = await getServerLocale();
  const dashboardCopy = copy[locale].dashboard;
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
      <div className="rounded-2xl border border-border bg-card px-4 py-3 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-start gap-8">
          <div>
          <h1 className="text-lg font-semibold tracking-tight text-card-foreground">
            {dashboardCopy.welcome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {dashboardCopy.snapshot}
          </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
              {dashboardCopy.weeklySchedule}
            </h2>
            <p className="text-sm text-muted-foreground">
              {dashboardCopy.weeklyHint}
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">
          {activeStudents.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground ring-1 ring-border/40">
              {dashboardCopy.addStudentHint}
            </div>
          ) : (
            <SessionCalendar students={activeStudents} locale={locale} />
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
            labels={{
              totalStudents: dashboardCopy.kpiTotalStudents,
              sessions7d: dashboardCopy.kpiSessions7d,
              remainingHours: dashboardCopy.kpiRemaining,
              hoursThisMonth: dashboardCopy.kpiThisMonth,
            }}
            className="grid-cols-2 sm:grid-cols-2"
          />

          <AnalyticsRow
            statusSeries={statusSeries}
            next7DaysSeries={next7DaysSeries}
            topStudents={topStudents}
            labels={{
              performanceTitle: dashboardCopy.chartPerformance,
              performanceSubtitle: dashboardCopy.chartByStatus,
              topStudentsTitle: dashboardCopy.chartTopStudents,
              topStudentsSubtitle: dashboardCopy.chartTopStudentsSub,
              weeklyTitle: dashboardCopy.chartWeeklyVolume,
              weeklySubtitle: dashboardCopy.chartWeeklyVolumeSub,
              statusLabels: {
                SCHEDULED: dashboardCopy.scheduled,
                COMPLETED: dashboardCopy.completed,
                NO_SHOW: dashboardCopy.noShow,
                CANCELLED_BY_TUTOR: dashboardCopy.cancelledByTutor,
                CANCELLED_BY_STUDENT: dashboardCopy.cancelledByStudent,
              },
            }}
          />

          <StudentsPanel
            students={studentSummaries.slice(0, 12)}
            labels={{
              panelTitle: dashboardCopy.panelProfiles,
              panelSubtitle: dashboardCopy.panelLive,
              viewAll: dashboardCopy.panelViewAll,
              empty: dashboardCopy.panelAddStudent,
              gradeFallback: dashboardCopy.gradeFallback,
              hoursLeftSuffix: dashboardCopy.hoursLeft,
              utilization: (pct) =>
                dashboardCopy.utilization.replace("{pct}", String(pct)),
            }}
          />
        </aside>
      </div>
    </div>
  );
}
