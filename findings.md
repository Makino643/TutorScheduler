# Findings (research & technical notes)

> External/untrusted content belongs here only — not in `task_plan.md`.

## Edge middleware + NextAuth + Prisma

- `middleware.ts` importing `auth` from `auth.ts` caused Next.js to bundle **Prisma** and **bcryptjs** for Edge when those were imported at the top level of `auth.ts` (or statically from `authorize`).
- **Fix:** implement tutor verification in [`lib/auth-credentials.ts`](./lib/auth-credentials.ts) and load it with `await import("@/lib/auth-credentials")` only inside `Credentials.authorize`. After the change, `npm run build` completed **without** Edge warnings for Prisma/bcrypt.

## Prisma seed location

- `DATABASE_URL=file:./dev.db` is resolved relative to `prisma/schema.prisma`, so the SQLite file is **`prisma/dev.db`** (not project root).

## Prisma 7 deprecation notice

- `package.json#prisma.seed` shows a Prisma 7 deprecation warning; migrate to `prisma.config.ts` later (non-blocking).

## Phase 2 — `/students` and middleware

- Student routes live at **`/students`** (URL has no `(dashboard)` segment). **`middleware.ts`** must include `/students` and `/students/:path*` in `config.matcher`, not only `/dashboard/:path*`, or unauthenticated users can open student pages.
- **`npm run test`** runs Vitest on `lib/**/*.test.ts`; **`npm run validate:phase2`** runs tests then the Phase 1 gate (`lint`, `typecheck`, `build`).

## Phase 3 — calendar overlap policy + APIs

- Implemented session APIs:
  - `GET /api/sessions?start=...&end=...`
  - `POST /api/sessions`
  - `PATCH /api/sessions/:id`
- Overlap is validated **server-side** for non-cancelled sessions (`startsAt < newEnd && endsAt > newStart`), and returns **HTTP 409** with a clear message.
- FullCalendar `eventDrop` and `eventResize` call PATCH and use `arg.revert()` on any failure (including 409), so UI never silently desyncs.

## Phase 4 — recurrence model

- Recurrence model is implemented as **materialized series rows** sharing `recurrenceId`; master row stores weekly `rrule` string (`FREQ=WEEKLY;COUNT=n`).
- Recurrence now supports two end modes for weekly booking:
  - `COUNT` (N occurrences)
  - `UNTIL` (inclusive cutoff date/time)
- Scope edits on drag/resize:
  - `this`: update only selected occurrence and detach it from series (`recurrenceId = null`, `rrule = null`) as an exception.
  - `following`: shift selected and later occurrences in the same series.
  - `all`: shift all occurrences in the series.
- Recurrence overlap is still enforced server-side with HTTP 409; for drag actions the UI reverts immediately.

## Calendar perceived latency + consistency

- Week navigation latency reduced by client-side range cache + adjacent-range prefetch in `session-calendar`.
- Cache must be invalidated on create/update; otherwise calendar can show stale data and make new booking appear missing.
- To avoid dashboard route-switch reset, persist calendar `view/date` and cache in `sessionStorage` (`dashboard-calendar-state`, `dashboard-calendar-cache`).

## Phase 5 — VooV integration notes

- `MeetingProvider` resolution order:
  1) session override `meetingUrl` / `meetingCode`
  2) tutor PMR settings (`voovPmrId`, `voovPmrPassword`)
  3) null (no meeting available)
- PMR ID accepts either raw ID (converted to `https://meeting.tencent.com/dm/<id>`) or full URL.
- Session override is saved through `PATCH /api/sessions/:id` with `scope: "this"` in the UI.

## Phase 6 — session lifecycle notes

- Lifecycle status is updated via `PATCH /api/sessions/:id` with `status`.
- UI exposes lifecycle actions on event click dialog:
  - `SCHEDULED`
  - `COMPLETED`
  - `CANCELLED_BY_TUTOR`
  - `CANCELLED_BY_STUDENT`
  - `NO_SHOW`
- Balance effect remains derived from `lib/balance.ts` policy:
  - `COMPLETED` and `NO_SHOW` consume hours
  - cancelled states do not consume

## Phase 7 — dashboard aggregates

- KPI/chart data is computed server-side from real rows (students, sessions, packages).
- Student rail shows per-student computed remaining hours (`computeRemainingHours`) for quick balance scanning.

## Phase 10 — iCal + CSV

- iCal feed is implemented through tokenized route `GET /api/ical/[token]`:
  - token checked against `ICAL_FEED_TOKEN`
  - cancelled/archived sessions are excluded from feed events
- CSV export/import is implemented via authenticated API routes:
  - export: students and sessions
  - import: students and sessions with row-level error collection
- For safer rollback flow after prior migration drift, Phase 10 implementation avoids introducing new schema migrations.

## Phase 11 — polish/a11y/responsive

- Dark mode implemented via CSS variable overrides on `.dark` class; no extra runtime theme library required.
- Hydration flash is prevented by setting theme class in an inline pre-hydration script on the root layout.
- Reduced motion is handled globally with a `prefers-reduced-motion` media query that minimizes transitions/animations.
- Mobile calendar policy is read-only/safe interactions by disabling create/edit gestures on small widths.

## Electron packaging + GitHub Releases (macOS first)

- For this Next.js + Prisma project, the reliable Electron approach is to run `next start` in-process (localhost) rather than static export.
- Packaging with `electron-builder` must include:
  - `.next`, `public`, `node_modules`, `prisma`, and Electron entry files.
  - `asarUnpack` for Prisma engine/runtime directories (`node_modules/.prisma`, `node_modules/@prisma`) and Next runtime when needed.
- macOS release quality depends on code signing + notarization:
  - Required CI secrets include `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
- GitHub Actions tag-based release (`v*`) is the cleanest automation path:
  - Build/publish macOS first, then append Windows artifacts to same release.

## Electron + Next.js + Prisma: lessons from initial broken builds

- **Spawning `process.execPath` in packaged Electron without `ELECTRON_RUN_AS_NODE=1`** re-executes the app binary, causing infinite window spawning. Always set `ELECTRON_RUN_AS_NODE=1` when running Node-style children.
- **`next start` will not start if its `cwd` does not contain `.next/` and `package.json`.** When packaged, those are inside `app.asar`, not `app.asar.unpacked`. The fix is to switch to **Next standalone output** (`output: "standalone"`) and run `node server.js` from `.next/standalone/`. Standalone is self-contained and asar-friendly.
- **SQLite DB cannot live inside `app.asar` (read-only).** Always copy the seeded DB to a writable path (`app.getPath("userData")`) on first launch and point `DATABASE_URL` to that copy.
- **Prisma engine binaries (`.dll`/`.dylib`) must be unpacked from asar** (loaded via OS `dlopen`, not Node fs). Use `asarUnpack` patterns like `**/node_modules/.prisma/**/*` and `**/node_modules/@prisma/**/*`.
- **Standalone trees do not include `public/` and `.next/static/` automatically.** A post-build script must copy them next to `server.js` (and optionally Prisma assets) so the standalone server can serve them.
- **`AUTH_SECRET` must be stable** across launches in production or sessions invalidate every restart. Generate once and persist under `userData`.
- **Run a splash window immediately and stream child logs to a file** under `userData/logs/`. Without this, any startup failure looks like “the app does nothing” to the user.
- **Packaged desktop login failures ("invalid password")** often mean the bundled SQLite had **no seeded tutor**: `prisma/dev.db` is usually gitignored, so CI builds shipped an empty DB. Fix: run `prisma migrate deploy` + `prisma db seed` before `prepare-standalone` (see `scripts/ensure-desktop-db.js`, chained in `npm run desktop:build`). Seed credentials come from `.env` / `.env.example` (`SEED_TUTOR_*`).

