import Link from "next/link";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { copy } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { computeRemainingHours } from "@/lib/balance";
import { subjectsToCommaString } from "@/lib/student-subjects";

function formatHours(n: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export default async function StudentsPage() {
  const locale = await getServerLocale();
  const studentsCopy = copy[locale].students;
  const students = await db.student.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: { packages: true, sessions: { where: { archivedAt: null } } },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-card-foreground">
            {studentsCopy.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {studentsCopy.subtitle}
          </p>
        </div>
        <Button asChild>
          <Link href="/students/new">{studentsCopy.addStudent}</Link>
        </Button>
      </div>

      {students.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground ring-1 ring-border/40">
          {studentsCopy.empty}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {students.map((st) => {
            const remaining = computeRemainingHours({
              packages: st.packages,
              sessions: st.sessions,
            });
            return (
              <li key={st.id}>
                <Link
                  href={`/students/${st.id}`}
                  className="flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: st.colorHex }}
                    title={`Color ${st.colorHex}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-card-foreground">{st.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {subjectsToCommaString(st.subjects) || studentsCopy.noSubjects}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">{studentsCopy.balanceHours}</p>
                    <p className="font-medium tabular-nums text-card-foreground">
                      {formatHours(remaining)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
