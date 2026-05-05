import { describe, expect, it } from "vitest";

import type { SessionStatus } from "@prisma/client";
import { computeRemainingHours } from "./balance";

function oneHour(status: SessionStatus) {
  return {
    status,
    startsAt: new Date("2026-05-05T10:00:00.000Z"),
    endsAt: new Date("2026-05-05T11:00:00.000Z"),
  };
}

describe("session lifecycle balance effects", () => {
  it("completed consumes one hour", () => {
    const remaining = computeRemainingHours({
      packages: [{ hoursPurchased: 5 }],
      sessions: [oneHour("COMPLETED")],
    });
    expect(remaining).toBe(4);
  });

  it("tutor-cancel refunds (does not consume)", () => {
    const remaining = computeRemainingHours({
      packages: [{ hoursPurchased: 5 }],
      sessions: [oneHour("CANCELLED_BY_TUTOR")],
    });
    expect(remaining).toBe(5);
  });

  it("no-show consumes", () => {
    const remaining = computeRemainingHours({
      packages: [{ hoursPurchased: 5 }],
      sessions: [oneHour("NO_SHOW")],
    });
    expect(remaining).toBe(4);
  });
});
