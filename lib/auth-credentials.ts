import { compare } from "bcryptjs";

import { db } from "@/lib/db";

/**
 * Server-only tutor login (used from NextAuth `authorize`).
 * Kept in a separate file so Edge middleware does not bundle Prisma/bcrypt.
 */
export async function authorizeTutorCredentials(
  credentials: Record<"email" | "password", string> | undefined,
): Promise<{ id: string; email: string; name: string } | null> {
  const email = credentials?.email;
  const password = credentials?.password;
  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }
  const tutor = await db.tutor.findUnique({ where: { email } });
  if (!tutor) return null;
  const valid = await compare(password, tutor.passwordHash);
  if (!valid) return null;
  return {
    id: tutor.id,
    email: tutor.email,
    name: tutor.displayName,
  };
}
