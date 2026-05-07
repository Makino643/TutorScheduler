# TutorFlow — task plan

**Goal:** Build the Tutor Scheduler per [DESIGN.md](./DESIGN.md) in phased milestones.

## Phases (DESIGN §10)


| Phase | Name              | Status       | Notes                                                                                                                                 |
| ----- | ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Bootstrap         | **complete** | Next.js, Tailwind v4, shadcn-style UI, Prisma SQLite, Auth.js shell, CI                                                               |
| 1     | Data model + auth | **complete** | Full §4 schema, seed tutor, `/login`, JWT credentials, `/dashboard` protected                                                         |
| 2     | Students CRUD     | **complete** | List `/students`, new + detail, top-up dialog → `Package`, `lib/balance.ts` + Vitest, auto `colorHex`, middleware `/students`         |
| 3     | Calendar MVP      | **complete** | FullCalendar Day/Week/Month/Year, drag-create BookSessionDialog, drag move/resize persistence, server overlap 409 via `/api/sessions` |
| 4     | Recurrence        | **complete** | Weekly recurrence creation, scope edit (`this/following/all`), exception via detaching occurrence from series                         |
| 5     | VooV integration  | **complete** | PMR settings page, MeetingProvider + tests, Join/Copy on session, meeting override fields                                             |
| 6     | Session lifecycle | **complete** | Status transitions in session dialog (scheduled/completed/cancel/no-show) + lifecycle balance tests                                   |
| 7     | Dashboard         | **complete** | KPI strip, Recharts widgets, student rail with real aggregate data                                                                    |
| 10    | iCal + CSV        | **complete** | `/api/ical/[token]` feed and `/api/csv/export|import` with settings entry points                                                     |
| 11    | Polish + a11y + responsive | **complete** | Dark mode toggle/persistence, reduced-motion CSS, mobile-safe calendar interactions, focus-safe dialog flows                         |
| 12    | Docker + deploy   | **complete** | Dockerfile + docker-compose + Windows LAN deployment runbook (`docs/deploy/windows-lan-docker.md`)                                  |
| i18n  | EN/ZH localization | **complete** | Locale foundation (`lib/i18n.ts`), language switcher, core routes/components localized                                                |
| 12+   | …                 | pending      | See DESIGN.md                                                                                                                         |


## Decisions

- **npm only** for installs/CI (no pnpm lockfile).
- **Credentials + JWT** (no Prisma adapter tables).
- **Edge middleware:** credential verification lives in `[lib/auth-credentials.ts](./lib/auth-credentials.ts)` and is loaded only from `authorize` via `import()` so middleware does not bundle Prisma/bcrypt.

## Errors encountered


| Error                                                                            | Attempt | Resolution                                                                                      |
| -------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| Edge middleware bundled `bcryptjs` / Prisma                                      | 1       | Moved tutor verification to `lib/auth-credentials.ts`; dynamic `import()` from `authorize` only |
| `session-catchup.py` (planning-with-files v2.2.0)                                | 1       | Python not installed on PATH — skipped; synced planning from conversation + repo state instead  |
| FullCalendar CSS import path (`@fullcalendar/*/index.css`) failed build          | 1       | Removed CSS imports from `globals.css`; package version works without external CSS files        |
| Windows EPERM when `prisma generate` rewrites engine DLL                         | 1       | `build` script changed to `next build`; Prisma client still generated on `postinstall`          |
| `session-catchup.py` path missing under `$env:USERPROFILE\\.claude\\skills\\...` | 1       | Script not found; synced planning files manually from current repo state                        |
| `session-catchup.py` file missing in current host layout                         | 1       | Manually synced planning files (`task_plan/progress/findings`)                                  |
| Prisma migration drift after prior feature rollback                              | 1       | Re-synced by avoiding new schema migration and implementing Phase 10 with env token + APIs      |
| None-blocking polish checks for lighthouse/playwright not available in-session   | 1       | Completed phase using automated gate + manual verification checklist updates                      |


## Next actions

1. Theme switching polish QA across all pages and edge components.
2. Locale QA expansion for date/time/number formatting edge cases.
3. Optional: settings-level locale/theme preferences sync to user profile (server-side).

