import { describe, expect, it } from "vitest";

import type { SessionStatus } from "@prisma/client";

import {
  computeRemainingHours,
  sessionDurationHours,
  sessionStatusConsumesBalance,
  sumConsumedHours,
  sumPurchasedHours,
} from "./balance";

function s(
  status: SessionStatus,
  start: string,
  end: string,
): { startsAt: Date; endsAt: Date; status: SessionStatus } {
  return {
    status,
    startsAt: new Date(start),
    endsAt: new Date(end),
  };
}

describe("balance", () => {
  it("sumPurchasedHours is zero with no packages", () => {
    expect(sumPurchasedHours([])).toBe(0);
  });

  it("computeRemainingHours is zero with no packages", () => {
    expect(
      computeRemainingHours({
        packages: [],
        sessions: [s("COMPLETED", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z")],
      }),
    ).toBe(0);
  });

  it("only COMPLETED and NO_SHOW consume hours", () => {
    expect(sessionStatusConsumesBalance("COMPLETED")).toBe(true);
    expect(sessionStatusConsumesBalance("NO_SHOW")).toBe(true);
    expect(sessionStatusConsumesBalance("SCHEDULED")).toBe(false);
    expect(sessionStatusConsumesBalance("CANCELLED_BY_TUTOR")).toBe(false);
    expect(sessionStatusConsumesBalance("CANCELLED_BY_STUDENT")).toBe(false);
  });

  it("full purchased hours when no consuming sessions", () => {
    expect(
      computeRemainingHours({
        packages: [{ hoursPurchased: 10 }],
        sessions: [],
      }),
    ).toBe(10);
  });

  it("scheduled session does not reduce balance", () => {
    expect(
      computeRemainingHours({
        packages: [{ hoursPurchased: 10 }],
        sessions: [s("SCHEDULED", "2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z")],
      }),
    ).toBe(10);
  });

  it("completed session consumes duration", () => {
    expect(
      computeRemainingHours({
        packages: [{ hoursPurchased: 10 }],
        sessions: [s("COMPLETED", "2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z")],
      }),
    ).toBe(8);
  });

  it("cancelled-by-tutor does not consume (refund path)", () => {
    expect(
      computeRemainingHours({
        packages: [{ hoursPurchased: 10 }],
        sessions: [s("CANCELLED_BY_TUTOR", "2026-01-01T10:00:00Z", "2026-01-01T05:00:00Z")],
      }),
    ).toBe(10);
  });

  it("sums multiple packages and subtracts multiple completed sessions", () => {
    expect(
      computeRemainingHours({
        packages: [{ hoursPurchased: 5 }, { hoursPurchased: 5 }],
        sessions: [
          s("COMPLETED", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z"),
          s("COMPLETED", "2026-01-02T10:00:00Z", "2026-01-02T12:30:00Z"),
        ],
      }),
    ).toBeCloseTo(10 - 1 - 2.5, 5);
  });

  it("sessionDurationHours is non-negative", () => {
    expect(
      sessionDurationHours(
        new Date("2026-01-01T12:00:00Z"),
        new Date("2026-01-01T10:00:00Z"),
      ),
    ).toBe(0);
  });

  it("sumConsumedHours matches policy", () => {
    const sessions = [
      s("COMPLETED", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z"),
      s("SCHEDULED", "2026-01-02T10:00:00Z", "2026-01-02T20:00:00Z"),
    ];
    expect(sumConsumedHours(sessions)).toBe(1);
  });
});
