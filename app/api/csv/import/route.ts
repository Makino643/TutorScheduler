import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { parseCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { nextStudentColorHex } from "@/lib/student-colors";

function parseDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let entity = "students";
  let csv = "";
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { entity?: string; csv?: string };
    entity = body.entity ?? "students";
    csv = body.csv ?? "";
  } else {
    const formData = await req.formData();
    entity = String(formData.get("entity") ?? "students");
    csv = String(formData.get("csv") ?? "");
  }
  const rows = parseCsv(csv);
  const errors: string[] = [];
  let imported = 0;

  if (entity === "sessions") {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      const studentName = (row.studentName ?? "").trim();
      const subject = (row.subject ?? "").trim() || "English";
      const startsAt = parseDate(row.startsAt ?? "");
      const endsAt = parseDate(row.endsAt ?? "");
      if (!studentName || !startsAt || !endsAt || startsAt >= endsAt) {
        errors.push(`Row ${i + 2}: invalid session payload.`);
        continue;
      }
      const student = await db.student.findFirst({
        where: { name: studentName, archivedAt: null },
        select: { id: true },
      });
      if (!student) {
        errors.push(`Row ${i + 2}: student '${studentName}' not found.`);
        continue;
      }
      await db.session.create({
        data: {
          studentId: student.id,
          subject,
          startsAt,
          endsAt,
          meetingUrl: (row.meetingUrl ?? "").trim() || null,
          meetingCode: (row.meetingCode ?? "").trim() || null,
        },
      });
      imported += 1;
    }
    return NextResponse.json({ entity, imported, errors });
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    const name = (row.name ?? "").trim();
    if (!name) {
      errors.push(`Row ${i + 2}: name is required.`);
      continue;
    }
    const subjects = (row.subjects ?? "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
    const colorHex = (row.colorHex ?? "").trim() || (await nextStudentColorHex());
    await db.student.create({
      data: {
        name,
        gradeLevel: (row.gradeLevel ?? "").trim() || null,
        subjects,
        parentContact: (row.parentContact ?? "").trim() || null,
        notes: (row.notes ?? "").trim() || null,
        colorHex,
      },
    });
    imported += 1;
  }

  return NextResponse.json({ entity: "students", imported, errors });
}
