"use strict";
/**
 * Ensures prisma/dev.db exists with schema + seeded tutor before packaging Electron.
 * CI checkout often has no dev.db (gitignored), so Mac/Windows artifacts would ship an
 * empty DB and login would always fail until this runs.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function parseEnvFile(relPath) {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full)) return {};
  const out = {};
  const text = fs.readFileSync(full, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function main() {
  Object.assign(process.env, parseEnvFile(".env.example"));
  Object.assign(process.env, parseEnvFile(".env"));

  // SQLite URL relative to prisma/schema.prisma directory (Prisma resolves ./dev.db → prisma/dev.db).
  process.env.DATABASE_URL = "file:./dev.db";

  console.log("[ensure-desktop-db] prisma migrate deploy…");
  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  console.log("[ensure-desktop-db] prisma db seed…");
  execSync("npx prisma db seed", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  const dbFile = path.join(root, "prisma", "dev.db");
  if (!fs.existsSync(dbFile)) {
    console.error("[ensure-desktop-db] Expected sqlite file missing:", dbFile);
    process.exit(1);
  }
  console.log("[ensure-desktop-db] OK:", dbFile);
}

main();
