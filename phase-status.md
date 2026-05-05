# Phase completion status

Single place to scan **done vs not done** (mirrors checkboxes in [DESIGN.md](./DESIGN.md) §10.2).

| Phase | Deliverable done | Validation done | Last updated |
| ----- | ---------------- | ----------------- | ------------ |
| **0** — Bootstrap | yes | yes (npm lint/typecheck/build; dev smoke; migrate) | 2026-05-04 |
| **1** — Data model + auth | yes | yes (`validate:phase1`; auth flows; seed) | 2026-05-04 |
| **2** — Students CRUD | yes | yes (see below) | 2026-05-04 |
| **3** — Calendar MVP | yes | yes (see below) | 2026-05-05 |
| **4** — Recurrence | yes | yes (see below) | 2026-05-05 |
| **5** — VooV | no | no | — |
| **6** — Session lifecycle | no | no | — |
| **7** — Dashboard | no | no | — |
| **8** — Reminders | no | no | — |
| **9** — Working hours | no | no | — |
| **10** — iCal + CSV | no | no | — |
| **11** — Polish / a11y | no | no | — |
| **12** — Docker | no | no | — |

### Phase 1 — how to re-validate locally

```powershell
npm run validate:phase1
npm run db:seed
npm run dev
```

1. Open `http://localhost:3000` → should land on `/login`.
2. Sign in with `SEED_TUTOR_EMAIL` / `SEED_TUTOR_PASSWORD` from `.env` (defaults in `.env.example`).
3. Confirm `/dashboard` loads and **Sign out** returns to `/login`.
4. Optional: `npx prisma studio` → open `Tutor` table and confirm row (no `passwordHash` in UI beyond DB column — expected in Studio only).

### Phase 2 — automated gate

```powershell
npm run validate:phase2
```

### Phase 2 — detailed manual verification

**Prep:** `npm run dev`, sign in as the seed tutor (`admin@tutorflow.local` / `TutorFlow!Demo1` unless overridden in `.env`).

1. **Auth on student routes**
   - Sign out (or use a private window while logged out).
   - Browse to `http://localhost:3000/students` and `http://localhost:3000/students/new`.
   - **Expect:** redirect to `/login` with a `callbackUrl` pointing back (middleware protects `/students`, not only `/dashboard`).

2. **Create student**
   - Sign in → click **Students** in the header nav (or open `/students`).
   - Click **Add student**, submit with a **blank name**.
   - **Expect:** redirect to `/students/new?error=...` and an inline error (“Name is required.”).
   - Fill **Name** (required), optional fields, submit.
   - **Expect:** redirect to `/students/{id}` (detail). List at `/students` shows the new row with a **color dot** (auto-palette) and **balance 0** if no packages.

3. **List vs detail**
   - From `/students`, click the student row.
   - **Expect:** same name, balance, subjects line; **Edit profile** form fields match what you entered.

4. **Edit persists**
   - Change name, grade, subjects (comma-separated), parent contact, notes → **Save changes**.
   - **Expect:** reload on same URL; fields show new values; `/students` list shows updated name/subjects snippet.

5. **Top-up (Package) and balance**
   - On the detail page, open **Top up hours**, enter **10** hours, optional note, submit (leave price empty or valid e.g. `120.50`).
   - **Expect:** return to detail; **Balance** shows **10** h; **Prepaid packages** table has a new row with correct hours and timestamp.
   - Open **Top up** again, enter **invalid price** (e.g. `abc`) and submit.
   - **Expect:** redirect with error “Price per session must be a valid decimal.” (or similar).
   - Optional cross-check: in `npx prisma studio`, open `Package` — row count matches top-ups; `Student.colorHex` matches the swatch on list/detail.

6. **Balance matches `computeRemainingHours` (DESIGN §10.2 B)**
   - With **only packages and no sessions**, balance equals sum of `hoursPurchased` (e.g. 10 + 5 → 15).
   - To simulate consumption without the calendar UI, add a row in Studio: `Session` for this student with `status` = `COMPLETED`, `startsAt` / `endsAt` exactly **1 hour** apart, valid `subject`.
   - Refresh the student detail page.
   - **Expect:** balance decreases by **1** hour (completed sessions consume; scheduled/cancelled do not — you can add a second session with `SCHEDULED` spanning 5 hours and confirm balance unchanged vs `lib/balance.ts` tests).

7. **Archive**
   - On the same student (not archived), submit **Archive student**.
   - **Expect:** redirect to `/students`; that student **no longer appears** in the list.
   - If you still have the detail URL bookmarked, opening `/students/{id}` **Expect:** page still loads with an **Archived** badge; **Top up** and **Archive** blocks are hidden for archived students.

8. **Regression**
   - `/dashboard` still loads; **Dashboard** / **Students** nav links work; **Sign out** still returns to `/login`.

### Phase 3 — automated gate

```powershell
npm run validate:phase3
```

### Phase 3 — detailed manual verification

**Prep**
- Ensure at least one active student exists in `/students`.
- Run `npm run dev`, sign in.

1. **Calendar loads with 4 views**
   - Open `/dashboard`.
   - Use toolbar buttons: **Day**, **Week**, **Month**, **Year**.
   - Use **prev**, **next**, **today** in each view.
   - **Expect:** all views render and navigation updates the title/date range correctly.

2. **Button-driven booking**
   - Click **Book session**.
   - Fill Student, Subject, Start, End and save.
   - **Expect:** new event appears immediately.
   - Refresh browser.
   - **Expect:** event is still present (persisted in DB, same event id under the hood).

3. **Drag-select booking**
   - In Day or Week view, drag over a free timeslot.
   - Dialog should open with prefilled Start/End.
   - Save.
   - **Expect:** event appears in selected slot and remains after refresh.

4. **Drag move / resize persistence**
   - Drag an event to another slot.
   - Resize event length by dragging bottom edge.
   - Refresh page.
   - **Expect:** moved/resized times persist.

5. **Overlap conflict (409)**
   - Create event A for a timespan (e.g. 10:00–11:00).
   - Attempt to create event B overlapping (e.g. 10:30–11:30), or drag another event into overlap.
   - **Expect:** inline error appears with conflict message.
   - **Expect:** for drag action, UI reverts to original slot (no silent overwrite).

6. **API authorization**
   - Sign out and call `/api/sessions` in browser.
   - **Expect:** `401` JSON response (`Unauthorized`).

### Phase 4 — automated gate

```powershell
npm run validate:phase4
```

### Phase 4 — detailed manual verification

**Prep**
- Ensure at least one student exists.
- Open `/dashboard` in **Week** view.

1. **Create weekly series**
   - Click **Book session**.
   - Set **Recurrence = Weekly** and **Occurrences = 4**.
   - Save.
   - **Expect:** 4 weekly events appear for the same student/subject.

2. **Edit one occurrence only**
   - Drag the 2nd occurrence to another time.
   - When prompted for scope, type `this`.
   - **Expect:** only that occurrence moves; others remain at original times.
   - Refresh page; verify it stays detached.

3. **Edit following occurrences**
   - Drag the 3rd occurrence.
   - Scope prompt: `following`.
   - **Expect:** the dragged occurrence and later ones move together; earlier ones do not.

4. **Edit all occurrences**
   - Drag any still-linked occurrence.
   - Scope prompt: `all`.
   - **Expect:** all linked occurrences move together.

5. **Conflict handling in recurrence**
   - Create a blocking one-off session overlapping one target slot.
   - Try moving a recurring occurrence (scope `all` or `following`) into overlap.
   - **Expect:** conflict error shown, no partial updates, dragged event reverts.

6. **Regression**
   - Create one-off session with recurrence = none.
   - **Expect:** behavior matches Phase 3 (single event only, normal drag/resize).
