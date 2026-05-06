import { SessionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const expected = process.env.ICAL_FEED_TOKEN ?? "dev-ical-token-change-me";
  if (token !== expected) {
    return new NextResponse("Not found", { status: 404 });
  }

  const sessions = await db.session.findMany({
    where: {
      archivedAt: null,
      status: { notIn: [SessionStatus.CANCELLED_BY_STUDENT, SessionStatus.CANCELLED_BY_TUTOR] },
    },
    include: {
      student: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const events = sessions
    .map(
      (s) => [
        "BEGIN:VEVENT",
        `UID:${s.id}@tutorflow.local`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(s.startsAt)}`,
        `DTEND:${toIcsDate(s.endsAt)}`,
        `SUMMARY:${s.student.name} · ${s.subject}`,
        s.meetingUrl ? `DESCRIPTION:Join link ${s.meetingUrl}` : "DESCRIPTION:Tutoring session",
        "END:VEVENT",
      ].join("\n"),
    )
    .join("\n");

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TutorFlow//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    events,
    "END:VCALENDAR",
    "",
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=60",
    },
  });
}
