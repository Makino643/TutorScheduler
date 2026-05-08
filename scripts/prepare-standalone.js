"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const standaloneDir = path.join(projectRoot, ".next", "standalone");

if (!fs.existsSync(standaloneDir)) {
  console.error(
    "[prepare-standalone] .next/standalone not found. Did 'next build' run with output: 'standalone'?",
  );
  process.exit(1);
}

function copyDirSync(source, target) {
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
  return true;
}

function copyFileSyncSafe(source, target) {
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return true;
}

const publicSource = path.join(projectRoot, "public");
const publicTarget = path.join(standaloneDir, "public");
console.log("[prepare-standalone] copying public ->", path.relative(projectRoot, publicTarget));
copyDirSync(publicSource, publicTarget);

const staticSource = path.join(projectRoot, ".next", "static");
const staticTarget = path.join(standaloneDir, ".next", "static");
console.log("[prepare-standalone] copying .next/static ->", path.relative(projectRoot, staticTarget));
copyDirSync(staticSource, staticTarget);

const prismaSchemaSource = path.join(projectRoot, "prisma", "schema.prisma");
const prismaSchemaTarget = path.join(standaloneDir, "prisma", "schema.prisma");
console.log("[prepare-standalone] copying prisma schema ->", path.relative(projectRoot, prismaSchemaTarget));
copyFileSyncSafe(prismaSchemaSource, prismaSchemaTarget);

const prismaMigrationsSource = path.join(projectRoot, "prisma", "migrations");
const prismaMigrationsTarget = path.join(standaloneDir, "prisma", "migrations");
console.log("[prepare-standalone] copying prisma migrations ->", path.relative(projectRoot, prismaMigrationsTarget));
copyDirSync(prismaMigrationsSource, prismaMigrationsTarget);

const prismaSeedDbSource = path.join(projectRoot, "prisma", "dev.db");
const prismaSeedDbTarget = path.join(standaloneDir, "prisma", "dev.db");
if (fs.existsSync(prismaSeedDbSource)) {
  console.log("[prepare-standalone] copying seeded prisma dev.db ->", path.relative(projectRoot, prismaSeedDbTarget));
  copyFileSyncSafe(prismaSeedDbSource, prismaSeedDbTarget);
} else {
  console.warn("[prepare-standalone] prisma/dev.db not found in project; runtime will create empty DB");
}

// Prisma engines + client — Next tracing usually copies them, but we
// add a defensive fallback to make sure they exist in the standalone tree.
const prismaModuleSources = [
  ["node_modules/.prisma/client", "node_modules/.prisma/client"],
  ["node_modules/@prisma/client", "node_modules/@prisma/client"],
  ["node_modules/@prisma/engines", "node_modules/@prisma/engines"],
];

for (const [rel, target] of prismaModuleSources) {
  const sourcePath = path.join(projectRoot, rel);
  const targetPath = path.join(standaloneDir, target);
  if (!fs.existsSync(sourcePath)) continue;
  if (fs.existsSync(targetPath)) continue;
  console.log("[prepare-standalone] (fallback) copying", rel, "into standalone");
  copyDirSync(sourcePath, targetPath);
}

console.log("[prepare-standalone] done");
