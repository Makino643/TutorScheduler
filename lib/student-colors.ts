import { db } from "@/lib/db";

/** Pastel accents aligned with DESIGN.md §6 */
export const STUDENT_PALETTE = [
  "#E89478",
  "#7EB6D8",
  "#8FBC8F",
  "#B8A9D9",
  "#E8C547",
  "#D4A574",
] as const;

export async function nextStudentColorHex(): Promise<string> {
  const count = await db.student.count();
  return STUDENT_PALETTE[count % STUDENT_PALETTE.length]!;
}
