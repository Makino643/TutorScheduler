"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Kpi = {
  activeStudents: number;
  upcoming7d: number;
  remainingHoursTotal: number;
  consumedThisMonth: number;
};

type Props = {
  kpi: Kpi;
  statusSeries: Array<{ name: string; value: number }>;
  next7DaysSeries: Array<{ day: string; sessions: number }>;
  studentRail: Array<{ id: string; name: string; remainingHours: number }>;
};

function formatHours(n: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);
}

export function DashboardOverview({
  kpi,
  statusSeries,
  next7DaysSeries,
  studentRail,
}: Props) {
  return (
    <aside className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active students</p>
          <p className="mt-1 text-2xl font-semibold">{kpi.activeStudents}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Sessions in next 7d</p>
          <p className="mt-1 text-2xl font-semibold">{kpi.upcoming7d}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Remaining prepaid hours</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatHours(kpi.remainingHoursTotal)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Consumed this month</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatHours(kpi.consumedThisMonth)}
          </p>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Sessions by status</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Next 7 days load</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={next7DaysSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Student rail</p>
        <ul className="space-y-2">
          {studentRail.map((s) => (
            <li key={s.id} className="rounded-md border border-border p-2">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatHours(s.remainingHours)} h remaining
              </p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
