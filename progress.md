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