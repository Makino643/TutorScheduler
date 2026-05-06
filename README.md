# TutorFlow (Tutor Scheduler)

Web-based 1-on-1 tutor scheduler. See [DESIGN.md](./DESIGN.md) for architecture and phased delivery.

## Prerequisites

- **Node.js** 22+ from [nodejs.org](https://nodejs.org/) (includes **npm**). No pnpm or Yarn required.

## Setup (npm only)

```powershell
cd c:\Development\TutorScheduler   # or your clone path
npm install
Copy-Item .env.example .env
# .env.example includes a dev-only AUTH_SECRET (32+ chars). For production use:
#   openssl rand -base64 32
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open the **Local:** URL from the terminal (usually [http://localhost:3000](http://localhost:3000)). You are redirected to **`/login`**, then after sign-in to **`/dashboard`**.

**Default seed tutor** (override in `.env`): email `shixian.liu643@outlook.com`, password `Miqishmily5` (see `SEED_TUTOR_*` in [`.env.example`](./.env.example)).

Auth.js: `/api/auth/*` (JWT credentials against `Tutor` table).

## Scripts

| Script           | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Next.js dev server (Turbopack)       |
| `npm run build`  | Production build |
| `npm start`      | Production server                    |
| `npm run lint`   | ESLint                               |
| `npm run typecheck` | `tsc --noEmit`                    |
| `npm run db:seed`   | Upsert demo `Tutor` (uses `SEED_TUTOR_*`) |
| `npm run validate:phase1` | Lint + typecheck + build (Phase 1 gate) |
| `npm run test` | Vitest unit tests (`lib/**/*.test.ts`) |
| `npm run validate:phase2` | `npm run test` then `validate:phase1` (Phase 2 gate) |
| `npm run validate:phase3` | Alias of `validate:phase2` (Phase 3 gate) |
| `npm run validate:phase4` | Test + lint + typecheck + build (Phase 4 gate) |
| `npm run validate:phase5` | Test + lint + typecheck + build (Phase 5 gate) |
| `npm run validate:phase6` | Test + lint + typecheck + build (Phase 6 gate) |
| `npm run validate:phase7` | Test + lint + typecheck + build (Phase 7 gate) |
| `npm run validate:phase10` | Test + lint + typecheck + build (Phase 10 gate) |

## Troubleshooting

- **Port in use:** Next may print `http://localhost:3001` — use that URL, or free port 3000 and restart.
- **500 / broken UI after switching tools:** delete `node_modules` and `.next`, then run **`npm install`** again (use only npm in this repo).
- **Database / env:** ensure `.env` exists and run `npx prisma migrate dev` once.

## Validation (Phases 0–10)

See [docs/QA_LOG.md](./docs/QA_LOG.md) and [phase-status.md](./phase-status.md) (including **Phase 2 + 3 + 4 + 5 + 6 + 7 + 10 manual steps**).

**Automated:** `npm run validate:phase1` (Phases 0–1); `npm run validate:phase2` adds balance tests; `npm run validate:phase3` covers calendar MVP; `npm run validate:phase4` adds recurrence validation; `npm run validate:phase5` covers VooV integration; `npm run validate:phase6` covers lifecycle transitions; `npm run validate:phase7` covers dashboard aggregates/widgets; `npm run validate:phase10` covers iCal + CSV APIs.

**Manual (auth):** `npm run dev` → `/` redirects to `/login` → sign in with seed credentials → `/dashboard` loads → **Sign out** returns to `/login`.

**Manual (students):** after sign-in, use **Students** in the nav or `/students` — full checklist in [phase-status.md](./phase-status.md).

**Manual (calendar):** `/dashboard` supports Day/Week/Month/Year views, drag-create, drag-move/resize, and overlap blocking — step-by-step checks in [phase-status.md](./phase-status.md).

**Manual (recurrence):** weekly series and `this/following/all` scope edits are documented in [phase-status.md](./phase-status.md).

**Manual (VooV):** PMR settings, Join/Copy actions, and per-session override behavior are documented in [phase-status.md](./phase-status.md).

**Manual (lifecycle):** status transitions (completed/cancel/no-show) and balance effects are documented in [phase-status.md](./phase-status.md).

**Manual (dashboard):** KPI/chart/rail data checks are documented in [phase-status.md](./phase-status.md).
**Manual (iCal + CSV):** tokenized iCal feed and CSV import/export checks are documented in [phase-status.md](./phase-status.md).

**Database:** `npx prisma migrate dev` applies migrations to `prisma/dev.db`; `npm run db:seed` upserts the demo tutor.

**Fresh clone:** `npm install` → `Copy-Item .env.example .env` → `npx prisma migrate dev` → `npm run db:seed` → `npm run dev`.

CI runs `npm ci`, `npx prisma migrate deploy`, lint, typecheck, and build (`.github/workflows/ci.yml`).
