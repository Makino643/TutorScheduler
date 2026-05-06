import { CalendarClock, GraduationCap, Hourglass, Users } from "lucide-react";

import { cn } from "@/lib/utils";

type Kpi = {
  activeStudents: number;
  upcoming7d: number;
  remainingHoursTotal: number;
  consumedThisMonth: number;
};

type Props = {
  kpi: Kpi;
  className?: string;
};

function formatHours(n: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);
}

export function KpiPills({ kpi, className }: Props) {
  const items = [
    {
      label: "Total students",
      value: kpi.activeStudents.toString(),
      icon: Users,
    },
    {
      label: "Sessions next 7d",
      value: kpi.upcoming7d.toString(),
      icon: CalendarClock,
    },
    {
      label: "Remaining hours",
      value: formatHours(kpi.remainingHoursTotal),
      icon: Hourglass,
    },
    {
      label: "Hours this month",
      value: formatHours(kpi.consumedThisMonth),
      icon: GraduationCap,
    },
  ] as const;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-4",
        className,
      )}
    >
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-lg font-semibold tracking-tight tabular-nums text-card-foreground">
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
