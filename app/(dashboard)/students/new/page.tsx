import Link from "next/link";

import { createStudent } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewStudentPage({ searchParams }: Props) {
  const locale = await getServerLocale();
  const studentsCopy = copy[locale].students;
  const commonCopy = copy[locale].common;
  const { error } = await searchParams;
  const errorMessage =
    error === "Name+required"
      ? studentsCopy.nameRequired
      : error
        ? decodeURIComponent(error.replace(/\+/g, " "))
        : null;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-card-foreground">
          {studentsCopy.newTitle}
        </h1>
        <Button variant="outline" asChild>
          <Link href="/students">{commonCopy.backToList}</Link>
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
          <Label htmlFor="name">{studentsCopy.name}</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gradeLevel">{studentsCopy.gradeLevelOptional}</Label>
          <Input id="gradeLevel" name="gradeLevel" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subjects">{studentsCopy.subjectsComma}</Label>
          <Input
            id="subjects"
            name="subjects"
            placeholder={locale === "zh" ? "数学, 物理" : "Math, Physics"}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="parentContact">{studentsCopy.parentContactOptional}</Label>
          <Input id="parentContact" name="parentContact" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">{studentsCopy.notesOptional}</Label>
          <Input id="notes" name="notes" />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit">{studentsCopy.createStudent}</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/students">{commonCopy.cancel}</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
