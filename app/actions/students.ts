"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { nextStudentColorHex } from "@/lib/student-colors";

function requireSession() {
  return auth().then((s) => {
    if (!s?.user) redirect("/login");
    return s;
  });
}

function parseSubjects(raw: string): string[] {
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function createStudent(formData: FormData) {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/students/new?error=Name+required");
  }
  const gradeLevel = String(formData.get("gradeLevel") ?? "").trim() || null;
  const parentContact = String(formData.get("parentContact") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const subjects = parseSubjects(String(formData.get("subjects") ?? ""));
  const colorHex = await nextStudentColorHex();

  const student = await db.student.create({
    data: {
      name,
      gradeLevel,
      parentContact,
      notes,
      subjects: subjects as unknown as Prisma.InputJsonValue,
      colorHex,
    },
  });

  revalidatePath("/students");
  redirect(`/students/${student.id}`);
}

export async function updateStudent(studentId: string, formData: FormData) {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect(`/students/${studentId}?error=Name+required`);
  }
  const gradeLevel = String(formData.get("gradeLevel") ?? "").trim() || null;
  const parentContact = String(formData.get("parentContact") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const subjects = parseSubjects(String(formData.get("subjects") ?? ""));

  await db.student.update({
    where: { id: studentId },
    data: {
      name,
      gradeLevel,
      parentContact,
      notes,
      subjects: subjects as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}`);
}

export async function archiveStudent(studentId: string) {
  await requireSession();
  await db.student.update({
    where: { id: studentId },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/students");
  redirect("/students");
}

export async function addPackage(studentId: string, formData: FormData) {
  await requireSession();
  const hoursRaw = String(formData.get("hoursPurchased") ?? "").trim();
  const hours = Number(hoursRaw);
  if (!Number.isFinite(hours) || hours <= 0) {
    redirect(`/students/${studentId}?error=Invalid+hours`);
  }
  const priceRaw = String(formData.get("pricePerSession") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  let pricePerSession: Prisma.Decimal | undefined;
  if (priceRaw.length > 0) {
    try {
      pricePerSession = new Prisma.Decimal(priceRaw);
    } catch {
      redirect(`/students/${studentId}?error=Invalid+price`);
    }
  }

  await db.package.create({
    data: {
      studentId,
      hoursPurchased: hours,
      pricePerSession,
      note,
    },
  });

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}`);
}
