import Link from "next/link";

import { createStudent } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewStudentPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorMessage =
    error === "Name+required"
      ? "Name is required."
      : error
        ? decodeURIComponent(error.replace(/\+/g, " "))
        : null;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-card-foreground">
          New student
        </h1>
        <Button variant="outline" asChild>
          <Link href="/students">Back to list</Link>
        </Button>
      </div>

      {errorMessage ? (
        <p
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <form
        action={createStudent}
        className="grid gap-4 rounded-2xl border border-border bg-card p-6 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gradeLevel">Grade level (optional)</Label>
          <Input id="gradeLevel" name="gradeLevel" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subjects">Subjects (comma-separated)</Label>
          <Input
            id="subjects"
            name="subjects"
            placeholder="Math, Physics"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="parentContact">Parent contact (optional)</Label>
          <Input id="parentContact" name="parentContact" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input id="notes" name="notes" />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit">Create student</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/students">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
