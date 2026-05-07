import Link from "next/link";
import { notFound } from "next/navigation";

import { archiveStudent, updateStudent } from "@/app/actions/students";
import { TopUpDialog } from "@/components/students/top-up-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeRemainingHours } from "@/lib/balance";
import { db } from "@/lib/db";
import { copy } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { subjectsToCommaString } from "@/lib/student-subjects";

function formatHours(n: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function StudentDetailPage({ params, searchParams }: Props) {
  const locale = await getServerLocale();
  const studentsCopy = copy[locale].students;
  const { id } = await params;
  const { error } = await searchParams;

  const student = await db.student.findUnique({
    where: { id },
    include: {
      packages: { orderBy: { purchasedAt: "desc" } },
      sessions: { where: { archivedAt: null } },
    },
  });

  if (!student) {
    notFound();
  }

  const remaining = computeRemainingHours({
    packages: student.packages,
    sessions: student.sessions,
  });

  const errorMessage =
    error === "Name+required"
      ? studentsCopy.nameRequired
      : error === "Invalid+hours"
        ? studentsCopy.invalidHours
        : error === "Invalid+price"
          ? studentsCopy.invalidPrice
          : error
            ? decodeURIComponent(error.replace(/\+/g, " "))
            : null;

  const archived = student.archivedAt != null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 h-10 w-10 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: student.colorHex }}
            title={student.colorHex}
            aria-hidden
          />
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-card-foreground">
              {student.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {studentsCopy.balance}:{" "}
              <span className="font-medium tabular-nums text-card-foreground">
                {formatHours(remaining)} h
              </span>
              {archived ? (
                <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">
                  {studentsCopy.archived}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/students">{studentsCopy.allStudents}</Link>
        </Button>
      </div>

      {errorMessage ? (
        <p
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-6 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-base font-semibold tracking-tight text-card-foreground">
          {studentsCopy.editProfile}
        </h2>
        {archived ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {studentsCopy.archivedEditHint}
          </p>
        ) : null}
        <form
          action={updateStudent.bind(null, id)}
          className="mt-4 grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="name">{studentsCopy.name}</Label>
            <Input id="name" name="name" required defaultValue={student.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gradeLevel">{studentsCopy.gradeLevel}</Label>
            <Input
              id="gradeLevel"
              name="gradeLevel"
              defaultValue={student.gradeLevel ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subjects">{studentsCopy.subjectsComma}</Label>
            <Input
              id="subjects"
              name="subjects"
              defaultValue={subjectsToCommaString(student.subjects)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="parentContact">{studentsCopy.parentContact}</Label>
            <Input
              id="parentContact"
              name="parentContact"
              defaultValue={student.parentContact ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">{studentsCopy.notes}</Label>
            <Input id="notes" name="notes" defaultValue={student.notes ?? ""} />
          </div>
          <Button type="submit" className="w-fit">
            {studentsCopy.saveChanges}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-semibold tracking-tight text-card-foreground">
            {studentsCopy.prepaidPackages}
          </h2>
          {!archived ? <TopUpDialog studentId={id} locale={locale} /> : null}
        </div>
        {student.packages.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{studentsCopy.noPackages}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{studentsCopy.purchased}</th>
                  <th className="py-2 pr-4 font-medium">{studentsCopy.hours}</th>
                  <th className="py-2 pr-4 font-medium">{studentsCopy.pricePerSession}</th>
                  <th className="py-2 font-medium">{studentsCopy.note}</th>
                </tr>
              </thead>
              <tbody>
                {student.packages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-border/80">
                    <td className="py-2 pr-4 tabular-nums text-card-foreground">
                      {pkg.purchasedAt.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{pkg.hoursPurchased}</td>
                    <td className="py-2 pr-4">
                      {pkg.pricePerSession != null
                        ? pkg.pricePerSession.toString()
                        : "—"}
                    </td>
                    <td className="py-2 text-muted-foreground">{pkg.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!archived ? (
        <section className="rounded-2xl border border-destructive/30 bg-card p-6 ring-1 ring-destructive/20">
          <h2 className="text-base font-semibold tracking-tight text-destructive">
            {studentsCopy.archiveStudent}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {studentsCopy.archiveHint}
          </p>
          <form action={archiveStudent.bind(null, id)} className="mt-4">
            <Button type="submit" variant="destructive">
              {studentsCopy.archiveStudent}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
