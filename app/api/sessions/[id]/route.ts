import { SessionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { applyDelta } from "@/lib/recurrence";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

async function hasOverlap(input: {
  startsAt: Date;
  endsAt: Date;
  exceptIds: string[];
}): Promise<boolean> {
  const conflict = await db.session.findFirst({
    where: {
      id: { notIn: input.exceptIds },
      status: { notIn: ["CANCELLED_BY_STUDENT", "CANCELLED_BY_TUTOR"] },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
    },
    select: { id: true },
  });
  return conflict != null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    startsAt?: string;
    endsAt?: string;
    scope?: "this" | "following" | "all";
    anchorStart?: string;
    meetingUrl?: string | null;
    meetingCode?: string | null;
    status?: SessionStatus;
  };

  const existing = await db.session.findUnique({
    where: { id },
    include: { student: { select: { name: true, colorHex: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  const startsAt = parseDate(body.startsAt) ?? existing.startsAt;
  const endsAt = parseDate(body.endsAt) ?? existing.endsAt;
  if (startsAt >= endsAt) {
    return NextResponse.json(
      { error: "Invalid payload for reschedule." },
      { status: 400 },
    );
  }
  const hasMeetingUrl = Object.prototype.hasOwnProperty.call(body, "meetingUrl");
  const hasMeetingCode = Object.prototype.hasOwnProperty.call(body, "meetingCode");
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  const meetingUrl = hasMeetingUrl
    ? (body.meetingUrl ?? "").trim() || null
    : undefined;
  const meetingCode = hasMeetingCode
    ? (body.meetingCode ?? "").trim() || null
    : undefined;
  const status = hasStatus ? body.status : undefined;

  const scope = body.scope ?? "this";
  const anchorStart = parseDate(body.anchorStart) ?? existing.startsAt;
  const deltaStartMs = startsAt.getTime() - anchorStart.getTime();
  const oldAnchorEnd = new Date(
    anchorStart.getTime() + (existing.endsAt.getTime() - existing.startsAt.getTime()),
  );
  const deltaEndMs = endsAt.getTime() - oldAnchorEnd.getTime();

  const targets = existing.recurrenceId && scope !== "this"
    ? await db.session.findMany({
        where: {
          recurrenceId: existing.recurrenceId,
          ...(scope === "following" ? { startsAt: { gte: existing.startsAt } } : {}),
        },
        orderBy: { startsAt: "asc" },
      })
    : [existing];

  const updates = targets.map((t) => ({
    id: t.id,
    startsAt: applyDelta(t.startsAt, deltaStartMs),
    endsAt: applyDelta(t.endsAt, deltaEndMs),
  }));

  for (const candidate of updates) {
    if (candidate.startsAt >= candidate.endsAt) {
      return NextResponse.json(
        { error: "Invalid payload for reschedule." },
        { status: 400 },
      );
    }
    if (
      await hasOverlap({
        startsAt: candidate.startsAt,
        endsAt: candidate.endsAt,
        exceptIds: updates.map((x) => x.id),
      })
    ) {
      return NextResponse.json(
        { error: "Time conflict: another session already exists in this range." },
        { status: 409 },
      );
    }
  }

  await db.$transaction(
    updates.map((u) =>
      db.session.update({
        where: { id: u.id },
        data: {
          startsAt: u.startsAt,
          endsAt: u.endsAt,
          meetingUrl,
          meetingCode,
          status,
          recurrenceId:
            scope === "this" && existing.recurrenceId ? null : undefined,
          rrule: scope === "this" ? null : undefined,
        },
      }),
    ),
  );

  const updated = await db.session.findUniqueOrThrow({
    where: { id },
  });

  return NextResponse.json({
    id: updated.id,
    title: `${existing.student.name} · ${updated.subject}`,
    start: updated.startsAt.toISOString(),
    end: updated.endsAt.toISOString(),
    backgroundColor: existing.student.colorHex,
    borderColor: existing.student.colorHex,
    extendedProps: {
      studentId: updated.studentId,
      subject: updated.subject,
      status: updated.status,
      recurrenceId: updated.recurrenceId,
      blocksTime: true,
    },
  });
}
