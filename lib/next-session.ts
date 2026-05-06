import { db } from "@/lib/db";

/**
 * Returns the number of minutes until the next scheduled, non-archived session.
 * Returns null when there is no upcoming session.
 */
export async function getNextSessionMinutes(now: Date = new Date()): Promise<number | null> {
  const session = await db.session.findFirst({
    where: {
      archivedAt: null,
      startsAt: { gte: now },
      status: "SCHEDULED",
    },
    orderBy: { startsAt: "asc" },
    select: { startsAt: true },
  });
  if (!session) return null;
  const minutes = Math.round((session.startsAt.getTime() - now.getTime()) / 60000);
  return Math.max(minutes, 0);
}
