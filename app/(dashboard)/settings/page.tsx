import { auth } from "@/auth";
import { updateVoovSettings } from "@/app/actions/settings";
import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const tutor = await db.tutor.findUnique({
    where: { id: session.user.id },
    select: { voovPmrId: true, voovPmrPassword: true },
  });
  const { saved } = await searchParams;
  const icalToken = process.env.ICAL_FEED_TOKEN ?? "dev-ical-token-change-me";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-card-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure VooV integration and data exchange.
        </p>
      </div>
      {saved === "1" ? (
        <p className="rounded-md border border-green-600/30 bg-green-100/40 px-3 py-2 text-sm text-green-800">
          Settings saved.
        </p>
      ) : null}
      <form
        action={updateVoovSettings}
        className="grid gap-4 rounded-2xl border border-border bg-card p-6 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div className="grid gap-2">
          <Label htmlFor="voovPmrId">VooV PMR ID or URL</Label>
          <Input
            id="voovPmrId"
            name="voovPmrId"
            defaultValue={tutor?.voovPmrId ?? ""}
            placeholder="e.g. 123456789 or https://meeting.tencent.com/dm/..."
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="voovPmrPassword">VooV PMR Password (optional)</Label>
          <Input
            id="voovPmrPassword"
            name="voovPmrPassword"
            defaultValue={tutor?.voovPmrPassword ?? ""}
          />
        </div>
        <Button type="submit" className="w-fit">
          Save settings
        </Button>
      </form>
      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-base font-semibold tracking-tight text-card-foreground">
          iCal + CSV
        </h2>
        <div className="grid gap-2 text-sm">
          <p className="text-muted-foreground">iCal feed URL (copy into calendar app):</p>
          <code className="rounded bg-muted px-2 py-1">
            /api/ical/{icalToken}
          </code>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a className="underline" href="/api/csv/export?entity=students">
            Export students CSV
          </a>
          <a className="underline" href="/api/csv/export?entity=sessions">
            Export sessions CSV
          </a>
        </div>
        <form action="/api/csv/import" method="post" className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="entity">Import entity</Label>
            <select
              id="entity"
              name="entity"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              defaultValue="students"
            >
              <option value="students">Students</option>
              <option value="sessions">Sessions</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="csv">CSV content</Label>
            <textarea
              id="csv"
              name="csv"
              rows={6}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Paste CSV rows here"
            />
          </div>
          <Button type="submit" className="w-fit">
            Import CSV
          </Button>
        </form>
      </section>
    </div>
  );
}
