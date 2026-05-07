"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

type StatusDatum = { name: string; value: number };
type DayDatum = { day: string; sessions: number };
type StudentDatum = { name: string; remainingHours: number };

type Props = {
  statusSeries: StatusDatum[];
  next7DaysSeries: DayDatum[];
  topStudents: StudentDatum[];
  labels: {
    performanceTitle: string;
    performanceSubtitle: string;
    topStudentsTitle: string;
    topStudentsSubtitle: string;
    weeklyTitle: string;
    weeklySubtitle: string;
    statusLabels: Partial<Record<string, string>>;
  };
  /** Outer grid classes; defaults to a single column suitable for a side rail. */
  className?: string;
  /** Chart canvas height in pixels (defaults to 176, denser for side rail). */
  chartHeight?: number;
};

function ChartCard({
  title,
  subtitle,
  height,
  children,
}: {
  title: string;
  subtitle?: string;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-2">
        <p className="text-sm font-semibold tracking-tight text-card-foreground">
          {title}
        </p>
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tickStyle = {
  fill: "var(--muted-foreground)",
  fontSize: 11,
} as const;

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--card-foreground)",
} as const;

const friendlyStatus: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED_BY_TUTOR: "Cancel (tutor)",
  CANCELLED_BY_STUDENT: "Cancel (student)",
};

export function AnalyticsRow({
  statusSeries,
  next7DaysSeries,
  topStudents,
  labels,
  className,
  chartHeight = 176,
}: Props) {
  const radarData = statusSeries.map((d) => ({
    metric: labels.statusLabels[d.name] ?? friendlyStatus[d.name] ?? d.name,
    value: d.value,
  }));

  return (
    <div className={cn("grid gap-3", className)}>
      <ChartCard
        title={labels.performanceTitle}
        subtitle={labels.performanceSubtitle}
        height={chartHeight}
      >
        <RadarChart data={radarData} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="metric" tick={{ ...tickStyle, fontSize: 10 }} />
          <Radar
            dataKey="value"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.25}
          />
          <Tooltip contentStyle={tooltipStyle} />
        </RadarChart>
      </ChartCard>

      <ChartCard
        title={labels.topStudentsTitle}
        subtitle={labels.topStudentsSubtitle}
        height={chartHeight}
      >
        <BarChart data={topStudents} margin={{ top: 4, right: 8, left: -16, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tick={{ ...tickStyle, fontSize: 10 }}
            interval={0}
            angle={-25}
            dy={10}
            height={32}
          />
          <YAxis allowDecimals={false} tick={tickStyle} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar
            dataKey="remainingHours"
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ChartCard>

      <ChartCard
        title={labels.weeklyTitle}
        subtitle={labels.weeklySubtitle}
        height={chartHeight}
      >
        <LineChart data={next7DaysSeries} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={tickStyle} />
          <YAxis allowDecimals={false} tick={tickStyle} width={28} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="sessions"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--primary)" }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ChartCard>
    </div>
  );
}
