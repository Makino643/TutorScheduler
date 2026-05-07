import Link from "next/link";

type StudentDatum = {
  id: string;
  name: string;
  gradeLevel: string | null;
  colorHex: string;
  remainingHours: number;
  consumedHours: number;
  totalPurchased: number;
};

type Props = {
  students: StudentDatum[];
  labels: {
    panelTitle: string;
    panelSubtitle: string;
    viewAll: string;
    empty: string;
    gradeFallback: string;
    hoursLeftSuffix: string;
    utilization: (pct: number) => string;
  };
};

function formatHours(n: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);
}

function utilization(d: StudentDatum): number {
  if (d.totalPurchased <= 0) return 0;
  const ratio = d.consumedHours / d.totalPurchased;
  return Math.max(0, Math.min(1, ratio));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

export function StudentsPanel({ students, labels }: Props) {
  return (
    <aside
      aria-label="Integrated student profiles"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight text-card-foreground">
            {labels.panelTitle}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {labels.panelSubtitle}
          </p>
        </div>
        <Link
          href="/students"
          className="text-[11px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded"
        >
          {labels.viewAll}
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <ul className="-mx-1 max-h-[640px] space-y-1 overflow-y-auto pr-1">
          {students.map((s) => {
            const pct = Math.round(utilization(s) * 100);
            return (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
                    style={{ backgroundColor: s.colorHex }}
                    aria-hidden
                  >
                    {initials(s.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {s.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {s.gradeLevel ?? labels.gradeFallback}
                    </p>
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-[11px] text-muted-foreground">
                      {formatHours(s.remainingHours)} {labels.hoursLeftSuffix}
                    </p>
                    <div
                      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={labels.utilization(pct)}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
