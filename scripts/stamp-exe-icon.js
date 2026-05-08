"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const { rcedit } = require("rcedit");

async function main() {
  const exePath = process.argv[2];
  const iconPath = process.argv[3];

  if (!exePath || !iconPath) {
    throw new Error("Usage: node scripts/stamp-exe-icon.js <exePath> <iconPath>");
  }

  const resolvedExe = path.resolve(exePath);
  const resolvedIcon = path.resolve(iconPath);

  if (!fs.existsSync(resolvedExe)) {
    throw new Error(`Executable not found: ${resolvedExe}`);
  }
  if (!fs.existsSync(resolvedIcon)) {
    throw new Error(`Icon not found: ${resolvedIcon}`);
  }

  await rcedit(resolvedExe, {
    icon: resolvedIcon,
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
