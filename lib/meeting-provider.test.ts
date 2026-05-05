import { describe, expect, it } from "vitest";

import { resolveMeetingForSession } from "./meeting-provider";

describe("meeting provider", () => {
  it("returns override meeting when session has meetingUrl", () => {
    const result = resolveMeetingForSession({
      tutor: { voovPmrId: "123456", voovPmrPassword: "pw" },
      session: {
        meetingUrl: "https://meeting.tencent.com/dm/custom",
        meetingCode: "custom-code",
      },
    });
    expect(result?.source).toBe("override");
    expect(result?.joinUrl).toBe("https://meeting.tencent.com/dm/custom");
    expect(result?.meetingCode).toBe("custom-code");
  });

  it("builds PMR URL from PMR id", () => {
    const result = resolveMeetingForSession({
      tutor: { voovPmrId: "998877", voovPmrPassword: null },
      session: { meetingUrl: null, meetingCode: null },
    });
    expect(result?.source).toBe("pmr");
    expect(result?.joinUrl).toBe("https://meeting.tencent.com/dm/998877");
    expect(result?.meetingCode).toBe("998877");
  });

  it("returns null when no override and no PMR", () => {
    const result = resolveMeetingForSession({
      tutor: { voovPmrId: null, voovPmrPassword: null },
      session: { meetingUrl: null, meetingCode: null },
    });
    expect(result).toBeNull();
  });
});
