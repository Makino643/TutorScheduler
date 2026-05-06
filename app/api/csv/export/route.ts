import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity") ?? "students";

  if (entity === "sessions") {
    const sessions = await db.session.findMany({
      where: { archivedAt: null },
      include: { student: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    });
    const csv = toCsv(
      [
        "id",
        "studentName",
        "subject",
        "startsAt",
        "endsAt",
        "status",
        "meetingUrl",
        "meetingCode",
      ],
      sessions.map((s) => ({
        id: s.id,
        studentName: s.student.name,
        subject: s.subject,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        status: s.status,
        meetingUrl: s.meetingUrl ?? "",
        meetingCode: s.meetingCode ?? "",
      })),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sessions.csv"',
      },
    });
  }

  const students = await db.student.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
  });
  const csv = toCsv(
    ["id", "name", "gradeLevel", "subjects", "parentContact", "notes", "colorHex"],
    students.map((s) => ({
      id: s.id,
      name: s.name,
      gradeLevel: s.gradeLevel ?? "",
      subjects: Array.isArray(s.subjects) ? s.subjects.join("|") : "",
      parentContact: s.parentContact ?? "",
      notes: s.notes ?? "",
      colorHex: s.colorHex,
    })),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="students.csv"',
    },
  });
}
