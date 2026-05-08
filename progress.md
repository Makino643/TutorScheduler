# Session / progress log

Format: `ISO date` — what changed — validation snippet.

---

## 2026-05-04

- **Phase 0** closed earlier: npm gate, `/` + `/dashboard` smoke, Prisma migrate (see `docs/QA_LOG.md`).
- **Phase 1 implemented:**
  - Prisma schema expanded to DESIGN §4 (`Tutor`, `Student`, `Package`, `Session`, `SessionStatus`).
  - Migration `20260504161556_phase1_init` + seed (`npm run db:seed` / post-`migrate dev`).
  - NextAuth Credentials against `Tutor.passwordHash` (`bcryptjs`).
  - Routes: `/` → redirect; `/login`; middleware protects `/dashboard/`*; dashboard header + **Sign out**.
  - Automated validation: `npm run validate:phase1` → pass after splitting auth credentials for Edge.
- **Planning files:** `task_plan.md`, `findings.md`, `phase-status.md` created/updated per planning-with-files workflow.
- **Phase 2 implemented:** `/students` list + `/students/new` + `/students/[id]` (edit, packages table, top-up dialog → `addPackage`), `archiveStudent`, middleware matcher for `/students`, `lib/balance.ts` + `lib/balance.test.ts`, `lib/student-colors.ts`, `lib/student-subjects.ts`, Vitest + `validate:phase2`. **Validation:** `npm run validate:phase2` pass; session-catchup script skipped (Python not on PATH in agent shell).
- **Phase 3 implemented:** FullCalendar Day/Week/Month/Year on `/dashboard` (`components/calendar/session-calendar.tsx`), `BookSessionDialog` via drag-select or button, persistence APIs (`GET/POST/PATCH /api/sessions`), server overlap conflict (`409`) with client error banner + drag revert. **Validation:** `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` all pass after implementation.
- **Phase 4 implemented:** recurrence helpers (`lib/recurrence.ts`) + tests, weekly series creation (`POST /api/sessions` with recurrence metadata), scope edits (`this/following/all`) in calendar drag flow, exception handling via detaching single occurrence from `recurrenceId`. **Validation:** `npm run validate:phase4` passes.

## 2026-05-05

- **Phase 4 follow-ups / stability fixes:**
  - Booking defaults `subject` to **English** in UI + API fallback.
  - Added recurrence **end mode**: `COUNT` (occurrences) or `UNTIL` (date).
  - Added `expandWeeklyStartsUntil()` + tests (`lib/recurrence.test.ts` now covers until-date expansion).
  - Improved calendar responsiveness with event-range cache + adjacent prefetch.
  - Fixed stale-cache issue where newly booked/updated sessions could appear missing by clearing cache on create/update before refetch.
- **Validation:** `npm run test`, `npm run lint`, `npm run typecheck` all pass after follow-up changes.
- **Phase 5 implemented:** `lib/meeting-provider.ts` + `meeting-provider.test.ts`, PMR settings page (`/settings`) with server action update, session API now resolves Join URL from override/PMR, calendar event-click dialog now supports **Join VooV**, **Copy link**, and per-session meeting override save.
- **Phase 5 validation:** `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` (and `validate:phase5`) passed.
- **Phase 6 implemented:** session lifecycle transitions in event dialog (`SCHEDULED`, `COMPLETED`, `CANCELLED_BY_TUTOR`, `CANCELLED_BY_STUDENT`, `NO_SHOW`) via `PATCH /api/sessions/:id` status updates; added lifecycle balance tests in `lib/session-lifecycle.test.ts`.
- **Phase 6 validation:** `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` (and `validate:phase6`) passed.
- **Dashboard reload UX fix:** calendar now persists view/date and event cache in `sessionStorage`, so switching between `/dashboard` and `/students`/`/settings` no longer resets week position or cold-loads immediately.
- **Phase 7 implemented:** dashboard now includes KPI strip + Recharts status/load widgets + student rail (real DB aggregates) above calendar.
- **Phase 7 validation:** `npm run validate:phase7` passed (test/lint/typecheck/build).

## 2026-05-06

- Removed the working-hours/blackout implementation from codebase and settings flow.
- **Phase 10 implemented (iCal + CSV):**
  - Added iCal feed endpoint: `GET /api/ical/[token]` (token from `ICAL_FEED_TOKEN`).
  - Added CSV endpoints:
    - `GET /api/csv/export?entity=students|sessions`
    - `POST /api/csv/import` for students/sessions CSV payloads
  - Added CSV helper + tests: `lib/csv.ts`, `lib/csv.test.ts`.
  - Updated settings page with iCal URL display, CSV export links, and CSV import form.
- **Phase 10 validation:** `npm run validate:phase10` passed (test/lint/typecheck/build).
- **Phase 11 implemented (Polish + a11y + responsive):**
  - Added dark mode token layer and persistence (`localStorage`) with startup hydration-safe script.
  - Added header theme toggle for quick light/dark switching.
  - Added reduced-motion global CSS fallback for accessibility preference.
  - Updated calendar behavior for mobile widths (`<=640px`) to safe read-only interactions.
  - Added semantic calendar section labeling for assistive technologies.
- **Phase 11 validation:** `npm run validate:phase11` passed (test/lint/typecheck/build).

## 2026-05-07

- **Phase 12 implemented (Docker/LAN deploy):**
  - Added `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.docker.example`.
  - Added deployment runbook: `docs/deploy/windows-lan-docker.md`.
  - Updated `.env.example` (`NEXTAUTH_URL`) + `README.md` Docker LAN section.
  - Fixed Docker build issue by copying `prisma/` before `npm ci` and installing `openssl`.
- **Localization implemented (EN/ZH):**
  - Added locale foundation: `lib/i18n.ts` (cookie-backed locale, dictionaries, template replacement).
  - Added language switch UI: `components/language-toggle.tsx`.
  - Integrated locale in layout hydration + dashboard shell + mobile bar + login.
  - Localized core routes/components: `/login`, `/dashboard`, `/students`, `/students/new`, `/students/[id]`, `/settings`, dashboard widgets, calendar interaction labels.
- **Validation:** `npm run lint` and `npx tsc --noEmit` passed after i18n + deploy changes.

## 2026-05-08

- Added desktop distribution runbook for Electron + GitHub Releases:
  - `docs/deploy/electron-github-release.md`
- Runbook includes:
  - Electron architecture for Next.js runtime (`next start` inside Electron)
  - `electron-builder` configuration template
  - macOS signing + notarization secret requirements
  - GitHub Actions release workflow (macOS-first, Windows secondary)
  - step-by-step version/tag/release execution flow
- Planning sync:
  - Added Phase 13 entry (`Electron desktop + GitHub Releases`) in `task_plan.md` as `in_progress`.
  - `session-catchup.py` remained unavailable on host path; context synced manually per current repository state.
- Implemented Electron release preparation in codebase:
  - Added `electron/main.js` and `electron/preload.js`.
  - Updated `package.json` with Electron entrypoint, desktop scripts (`desktop:dev`, `desktop:build`, `desktop:pack`, `desktop:release`), and `electron-builder` config.
  - Configured unsigned mac build (`build.mac.identity = null`, `hardenedRuntime = false`) and mac/win targets.
  - Installed dependencies: `electron`, `electron-builder`, `wait-on`, `concurrently`, `cross-env`.
- Validation after setup:
  - `npm run lint` passed.
  - `npx tsc --noEmit` passed.
- Reworked Electron packaging into a workable build (Phase 13):
  - Switched to Next.js standalone output (`output: "standalone"`) with explicit Prisma tracing in `next.config.ts`.
  - Added `scripts/prepare-standalone.js` that, after `next build`, populates `.next/standalone/` with:
    - `public/`
    - `.next/static/`
    - `prisma/schema.prisma`, `prisma/migrations/`, seeded `prisma/dev.db`
    - Defensive copy of `node_modules/.prisma/client` and `node_modules/@prisma/{client,engines}` if Next tracing missed them.
  - Rewrote `electron/main.js`:
    - Splash window shown immediately so the app is never visually unresponsive.
    - Picks a free port; spawns the standalone `server.js` via Electron-as-Node (`ELECTRON_RUN_AS_NODE=1`).
    - Sets `DATABASE_URL` to a writable copy of `dev.db` under `userData/data/`.
    - Persists a stable `AUTH_SECRET` in `userData/auth-secret`.
    - Streams server stdout/stderr into `userData/logs/main.log`.
    - On startup failure, renders a diagnostic HTML page in the same window that includes the log path.
  - Updated `electron-builder` config:
    - `files`: `electron/**/*`, `.next/standalone/**/*`, `.next/static/**/*`, `public/**/*`, `package.json`.
    - `extraResources`: ships `prisma/schema.prisma`, migrations, and seeded `dev.db` to `resources/prisma/`.
    - `asarUnpack`: `**/node_modules/.prisma/**/*`, `**/node_modules/@prisma/**/*`, `**/.next/standalone/prisma/**/*` (so Prisma engine `.dll` is on disk and writable assets aren't trapped in asar).
  - Root causes of the prior three failed builds documented (recursive exec, wrong cwd for `next start`, asar-trapped DB).
- Validation after rework:
  - `npm run lint` passed.
  - `npx tsc --noEmit` passed.
  - `npm run desktop:pack:fresh` produced installer + zip + `win-unpacked` successfully; packaged tree contains `app.asar.unpacked/.next/standalone/server.js`, Prisma engine `.dll` unpacked, and seeded `dev.db` under `resources/prisma/`.