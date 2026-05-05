import type { SessionStatus } from "@prisma/client";

/** Hours between session start and end (fractional). */
export function sessionDurationHours(startsAt: Date, endsAt: Date): number {
  const ms = endsAt.getTime() - startsAt.getTime();
  return Math.max(0, ms / 3_600_000);
}

/**
 * Which session statuses reduce prepaid balance (hours).
 * SCHEDULED does not consume until completed — see DESIGN.md balance discussion.
 */
export function sessionStatusConsumesBalance(status: SessionStatus): boolean {
  switch (status) {
    case "COMPLETED":
    case "NO_SHOW":
      return true;
    case "SCHEDULED":
    case "CANCELLED_BY_TUTOR":
    case "CANCELLED_BY_STUDENT":
      return false;
    default:
      return false;
  }
}

export function sumPurchasedHours(
  packages: ReadonlyArray<{ hoursPurchased: number }>,
): number {
  return packages.reduce((s, p) => s + p.hoursPurchased, 0);
}

export function sumConsumedHours(
  sessions: ReadonlyArray<{
    startsAt: Date;
    endsAt: Date;
    status: SessionStatus;
  }>,
): number {
  return sessions.reduce((sum, sess) => {
    if (!sessionStatusConsumesBalance(sess.status)) return sum;
    return sum + sessionDurationHours(sess.startsAt, sess.endsAt);
  }, 0);
}

/** Remaining prepaid hours (never negative). */
export function computeRemainingHours(input: {
  packages: ReadonlyArray<{ hoursPurchased: number }>;
  sessions: ReadonlyArray<{
    startsAt: Date;
    endsAt: Date;
    status: SessionStatus;
  }>;
}): number {
  const purchased = sumPurchasedHours(input.packages);
  const consumed = sumConsumedHours(input.sessions);
  return Math.max(0, purchased - consumed);
}
