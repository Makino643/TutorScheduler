export type TutorMeetingSettings = {
  voovPmrId: string | null;
  voovPmrPassword: string | null;
};

export type SessionMeetingSettings = {
  meetingUrl: string | null;
  meetingCode: string | null;
};

export type ResolvedMeeting = {
  joinUrl: string;
  meetingCode: string | null;
  password: string | null;
  source: "override" | "pmr";
};

function normalizeMaybeUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://meeting.tencent.com/dm/${encodeURIComponent(value)}`;
}

export function resolveMeetingForSession(input: {
  tutor: TutorMeetingSettings;
  session: SessionMeetingSettings;
}): ResolvedMeeting | null {
  if (input.session.meetingUrl) {
    return {
      joinUrl: input.session.meetingUrl,
      meetingCode: input.session.meetingCode,
      password: input.tutor.voovPmrPassword,
      source: "override",
    };
  }

  if (!input.tutor.voovPmrId) return null;
  return {
    joinUrl: normalizeMaybeUrl(input.tutor.voovPmrId),
    meetingCode: input.session.meetingCode ?? input.tutor.voovPmrId,
    password: input.tutor.voovPmrPassword,
    source: "pmr",
  };
}
