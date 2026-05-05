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

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-xl font-semibold text-card-foreground">Settings</h1>
      {saved === "1" ? (
        <p className="rounded-md border border-green-600/30 bg-green-100/40 px-3 py-2 text-sm text-green-800">
          VooV settings saved.
        </p>
      ) : null}
      <form
        action={updateVoovSettings}
        className="grid gap-4 rounded-[var(--radius)] border border-border bg-card p-6"
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
    </div>
  );
}
