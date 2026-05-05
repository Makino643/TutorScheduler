import { hashSync } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email =
    process.env.SEED_TUTOR_EMAIL ?? "admin@tutorflow.local";
  const password = process.env.SEED_TUTOR_PASSWORD ?? "TutorFlow!Demo1";
  const displayName =
    process.env.SEED_TUTOR_DISPLAY_NAME ?? "Demo Tutor";

  const passwordHash = hashSync(password, 12);

  await prisma.tutor.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      displayName,
      workingHours: {},
      timezone: "Asia/Shanghai",
    },
    update: {
      passwordHash,
      displayName,
    },
  });

  console.log(`Seeded tutor: ${email} (password from SEED_TUTOR_PASSWORD or default in README)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
