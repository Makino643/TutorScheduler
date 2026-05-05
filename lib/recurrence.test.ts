import { describe, expect, it } from "vitest";

import {
  addDays,
  applyDelta,
  expandWeeklyStarts,
  expandWeeklyStartsUntil,
} from "./recurrence";

describe("recurrence helpers", () => {
  it("expands weekly starts for count", () => {
    const startsAt = new Date("2026-05-05T10:00:00.000Z");
    const starts = expandWeeklyStarts({ startsAt, count: 3 });
    expect(starts).toHaveLength(3);
    expect(starts[0]?.toISOString()).toBe("2026-05-05T10:00:00.000Z");
    expect(starts[1]?.toISOString()).toBe("2026-05-12T10:00:00.000Z");
    expect(starts[2]?.toISOString()).toBe("2026-05-19T10:00:00.000Z");
  });

  it("returns one start for count<=1", () => {
    const starts = expandWeeklyStarts({
      startsAt: new Date("2026-05-05T10:00:00.000Z"),
      count: 1,
    });
    expect(starts).toHaveLength(1);
  });

  it("expands weekly starts until cutoff date", () => {
    const starts = expandWeeklyStartsUntil({
      startsAt: new Date("2026-05-05T10:00:00.000Z"),
      until: new Date("2026-05-26T10:00:00.000Z"),
    });
    expect(starts).toHaveLength(4);
    expect(starts[3]?.toISOString()).toBe("2026-05-26T10:00:00.000Z");
  });

  it("applyDelta shifts date by milliseconds", () => {
    const src = new Date("2026-05-05T10:00:00.000Z");
    const shifted = applyDelta(src, 90 * 60 * 1000);
    expect(shifted.toISOString()).toBe("2026-05-05T11:30:00.000Z");
  });

  it("addDays keeps same local time with day offset", () => {
    const src = new Date("2026-05-05T10:00:00.000Z");
    expect(addDays(src, 14).toISOString()).toBe("2026-05-19T10:00:00.000Z");
  });
});
