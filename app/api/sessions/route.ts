import { SessionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveMeetingForSession } from "@/lib/meeting-provider";
import { expandWeeklyStarts, expandWeeklyStartsUntil } from "@/lib/recurrence";

function isCancelled(status: SessionStatus): boolean {
  return status === "CANCELLED_BY_STUDENT" || status === "CANCELLED_BY_TUTOR";
}

async function hasOverlap(input: {
  startsAt: Date;
  endsAt: Date;
  exceptId?: string;
}): Promise<boolean> {
  const conflict = await db.session.findFirst({
    where: {
      archivedAt: null,
      id: input.exceptId ? { not: input.exceptId } : undefined,
      status: { notIn: ["CANCELLED_BY_STUDENT", "CANCELLED_BY_TUTOR"] },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
    },
    select: { id: true },
  });
  return conflict != null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = parseDate(searchParams.get("start"));
  const end = parseDate(searchParams.get("end"));

  const sessions = await db.session.findMany({
    where: {
      archivedAt: null,
      ...(start && end
        ? {
            startsAt: { lt: end },
            endsAt: { gt: start },
          }
        : {}),
    },
    include: { student: { select: { name: true, colorHex: true } } },
    orderBy: { startsAt: "asc" },
  });
  const tutor = await db.tutor.findFirst({
    where: { id: session.user.id },
    select: { voovPmrId: true, voovPmrPassword: true },
  });

  return NextResponse.json(
    sessions.map((s) => {
      const meeting = resolveMeetingForSession({
        tutor: {
          voovPmrId: tutor?.voovPmrId ?? null,
          voovPmrPassword: tutor?.voovPmrPassword ?? null,
        },
        session: { meetingUrl: s.meetingUrl, meetingCode: s.meetingCode },
      });
      return {
        id: s.id,
        title: `${s.student.name} · ${s.subject}`,
        start: s.startsAt.toISOString(),
        end: s.endsAt.toISOString(),
        backgroundColor: s.student.colorHex,
        borderColor: s.student.colorHex,
        extendedProps: {
          studentId: s.studentId,
          subject: s.subject,
          status: s.status,
          recurrenceId: s.recurrenceId,
          blocksTime: !isCancelled(s.status),
          meetingUrl: s.meetingUrl,
          meetingCode: s.meetingCode,
          joinUrl: meeting?.joinUrl ?? null,
        },
      };
    }),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    studentId?: string;
    subject?: string;
    startsAt?: string;
    endsAt?: string;
    notes?: string;
    recurrence?: {
      freq?: "NONE" | "WEEKLY";
      count?: number;
      until?: string;
      endMode?: "COUNT" | "UNTIL";
    };
  };

  const studentId = body.studentId?.trim();
  const subject = body.subject?.trim() || "English";
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);

  if (!studentId || !startsAt || !endsAt || startsAt >= endsAt) {
    return NextResponse.json(
      { error: "Invalid payload for booking session." },
      { status: 400 },
    );
  }

  const student = await db.student.findFirst({
    where: { id: studentId, archivedAt: null },
    select: { id: true, name: true, colorHex: true },
  });
  if (!student) {
    return NextResponse.json(
      { error: "Student not found or archived." },
      { status: 404 },
    );
  }

  const durationMs = endsAt.getTime() - startsAt.getTime();
  const recurrenceFreq = body.recurrence?.freq ?? "NONE";
  const recurrenceCount = Math.max(1, Math.trunc(body.recurrence?.count ?? 1));
  const recurrenceEndMode = body.recurrence?.endMode ?? "COUNT";
  const recurrenceUntil = parseDate(body.recurrence?.until);
  const starts =
    recurrenceFreq === "WEEKLY"
      ? recurrenceEndMode === "UNTIL" && recurrenceUntil
        ? expandWeeklyStartsUntil({ startsAt, until: recurrenceUntil })
        : expandWeeklyStarts({ startsAt, count: recurrenceCount })
      : [startsAt];

  for (const startCandidate of starts) {
    const endCandidate = new Date(startCandidate.getTime() + durationMs);
    if (await hasOverlap({ startsAt: startCandidate, endsAt: endCandidate })) {
      return NextResponse.json(
        { error: "Time conflict: another session already exists in this range." },
        { status: 409 },
      );
    }
  }

  const recurrenceId =
    recurrenceFreq === "WEEKLY" && starts.length > 1 ? crypto.randomUUID() : null;
  const created = await db.$transaction(
    starts.map((startCandidate, i) =>
      db.session.create({
        data: {
          studentId,
          subject,
          startsAt: startCandidate,
          endsAt: new Date(startCandidate.getTime() + durationMs),
          notes: body.notes?.trim() || null,
          recurrenceId,
          rrule:
            i === 0 && recurrenceId
              ? recurrenceEndMode === "UNTIL" && recurrenceUntil
                ? `FREQ=WEEKLY;UNTIL=${recurrenceUntil.toISOString()}`
                : `FREQ=WEEKLY;COUNT=${starts.length}`
              : null,
        },
      }),
    ),
  );

  const first = created[0]!;
  return NextResponse.json({
    id: first.id,
    title: `${student.name} · ${first.subject}`,
    start: first.startsAt.toISOString(),
    end: first.endsAt.toISOString(),
    backgroundColor: student.colorHex,
    borderColor: student.colorHex,
    extendedProps: {
      studentId: first.studentId,
      subject: first.subject,
      status: first.status,
      recurrenceId: first.recurrenceId,
      blocksTime: true,
    },
  });
}
