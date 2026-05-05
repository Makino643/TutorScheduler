import Link from "next/link";
import { notFound } from "next/navigation";

import { archiveStudent, updateStudent } from "@/app/actions/students";
import { TopUpDialog } from "@/components/students/top-up-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeRemainingHours } from "@/lib/balance";
import { db } from "@/lib/db";
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
      ? "Name is required."
      : error === "Invalid+hours"
        ? "Hours must be a positive number."
        : error === "Invalid+price"
          ? "Price per session must be a valid decimal."
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
            <h1 className="text-xl font-semibold text-card-foreground">
              {student.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Balance:{" "}
              <span className="font-medium tabular-nums text-card-foreground">
                {formatHours(remaining)} h
              </span>
              {archived ? (
                <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">
                  Archived
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/students">All students</Link>
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

      <section className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium text-card-foreground">Edit profile</h2>
        {archived ? (
          <p className="mt-2 text-sm text-muted-foreground">
            This student is archived. Editing is still allowed if you need to fix
            data.
          </p>
        ) : null}
        <form
          action={updateStudent.bind(null, id)}
          className="mt-4 grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={student.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gradeLevel">Grade level</Label>
            <Input
              id="gradeLevel"
              name="gradeLevel"
              defaultValue={student.gradeLevel ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subjects">Subjects (comma-separated)</Label>
            <Input
              id="subjects"
              name="subjects"
              defaultValue={subjectsToCommaString(student.subjects)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="parentContact">Parent contact</Label>
            <Input
              id="parentContact"
              name="parentContact"
              defaultValue={student.parentContact ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue={student.notes ?? ""} />
          </div>
          <Button type="submit" className="w-fit">
            Save changes
          </Button>
        </form>
      </section>

      <section className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-card-foreground">
            Prepaid packages
          </h2>
          {!archived ? <TopUpDialog studentId={id} /> : null}
        </div>
        {student.packages.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No packages yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Purchased</th>
                  <th className="py-2 pr-4 font-medium">Hours</th>
                  <th className="py-2 pr-4 font-medium">Price / session</th>
                  <th className="py-2 font-medium">Note</th>
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
        <section className="rounded-[var(--radius)] border border-destructive/30 bg-card p-6">
          <h2 className="text-lg font-medium text-destructive">Archive student</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Removes the student from the main list. Packages and sessions are kept
            in the database.
          </p>
          <form action={archiveStudent.bind(null, id)} className="mt-4">
            <Button type="submit" variant="destructive">
              Archive student
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
