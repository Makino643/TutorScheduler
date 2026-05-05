"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function updateVoovSettings(formData: FormData) {
  const tutorId = await requireUserId();
  const voovPmrId = String(formData.get("voovPmrId") ?? "").trim() || null;
  const voovPmrPassword =
    String(formData.get("voovPmrPassword") ?? "").trim() || null;

  await db.tutor.update({
    where: { id: tutorId },
    data: { voovPmrId, voovPmrPassword },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?saved=1");
}
