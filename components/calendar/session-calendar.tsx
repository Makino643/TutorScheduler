"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import timeGridPlugin from "@fullcalendar/timegrid";
import type {
  DateSelectArg,
  EventChangeArg,
  EventInput,
} from "@fullcalendar/core/index.js";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StudentOption = {
  id: string;
  name: string;
};

type Props = {
  students: StudentOption[];
};

type DraftBooking = {
  studentId: string;
  subject: string;
  startsAt: string;
  endsAt: string;
  recurrenceFreq: "NONE" | "WEEKLY";
  recurrenceEndMode: "COUNT" | "UNTIL";
  recurrenceCount: string;
  recurrenceUntil: string;
};
type SessionMeetingDraft = {
  id: string;
  title: string;
  recurrenceId: string | null;
  joinUrl: string | null;
  meetingUrl: string;
  meetingCode: string;
  startsAt: string;
  endsAt: string;
  status:
    | "SCHEDULED"
    | "COMPLETED"
    | "CANCELLED_BY_TUTOR"
    | "CANCELLED_BY_STUDENT"
    | "NO_SHOW";
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromRange(start: Date, end: Date, defaultStudentId: string): DraftBooking {
  const defaultUntil = new Date(start.getTime() + 35 * 24 * 60 * 60 * 1000);
  return {
    studentId: defaultStudentId,
    subject: "English",
    startsAt: toLocalInputValue(start),
    endsAt: toLocalInputValue(end),
    recurrenceFreq: "NONE",
    recurrenceEndMode: "COUNT",
    recurrenceCount: "6",
    recurrenceUntil: toLocalInputValue(defaultUntil),
  };
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  let message = "Request failed.";
  try {
    const data = (await res.json()) as { error?: string };
    if (data.error) message = data.error;
  } catch {
    // keep fallback message
  }
  throw new Error(message);
}

function eventOverlapsRange(
  event: { start?: unknown; end?: unknown },
  rangeStartStr: string,
  rangeEndStr: string,
): boolean {
  if (!event.start || !event.end) return false;
  const eventStart = new Date(event.start as string | number | Date).getTime();
  const eventEnd = new Date(event.end as string | number | Date).getTime();
  const rangeStart = new Date(rangeStartStr).getTime();
  const rangeEnd = new Date(rangeEndStr).getTime();
  if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd)) return false;
  return eventStart < rangeEnd && eventEnd > rangeStart;
}

export function SessionCalendar({ students }: Props) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const eventsCacheRef = useRef<Map<string, EventInput[]>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [draft, setDraft] = useState<DraftBooking>(() => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return fromRange(start, end, students[0]?.id ?? "");
  });
  const [selectedSession, setSelectedSession] = useState<SessionMeetingDraft | null>(
    null,
  );
  const [meetingOpen, setMeetingOpen] = useState(false);

  const [calendarReady, setCalendarReady] = useState(false);
  const [persistedView, setPersistedView] = useState<string>("timeGridWeek");
  const [persistedDate, setPersistedDate] = useState<Date>(new Date());
  const initialDate = useMemo(() => persistedDate, [persistedDate]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("dashboard-calendar-state");
      if (raw) {
        const parsed = JSON.parse(raw) as { view?: string; date?: string };
        if (parsed.view) setPersistedView(parsed.view);
        if (parsed.date) {
          const d = new Date(parsed.date);
          if (Number.isFinite(d.getTime())) setPersistedDate(d);
        }
      }
      const rawCache = window.sessionStorage.getItem("dashboard-calendar-cache");
      if (rawCache) {
        const parsed = JSON.parse(rawCache) as Array<[string, EventInput[]]>;
        eventsCacheRef.current = new Map(parsed);
      }
    } finally {
      setCalendarReady(true);
    }
    return () => {
      window.sessionStorage.setItem(
        "dashboard-calendar-cache",
        JSON.stringify(Array.from(eventsCacheRef.current.entries())),
      );
    };
  }, []);

  const handleSelect = (arg: DateSelectArg) => {
    setError(null);
    setDraft(fromRange(arg.start, arg.end, students[0]?.id ?? ""));
    setOpen(true);
  };

  const refetchEvents = () => {
    const api = calendarRef.current?.getApi();
    api?.refetchEvents();
  };
  const invalidateEventsCache = () => {
    eventsCacheRef.current.clear();
  };

  const handleCreate = async (formData: FormData) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        studentId: String(formData.get("studentId") ?? "").trim(),
        subject: String(formData.get("subject") ?? "").trim() || "English",
        startsAt: String(formData.get("startsAt") ?? ""),
        endsAt: String(formData.get("endsAt") ?? ""),
        recurrence: {
          freq: String(formData.get("recurrenceFreq") ?? "NONE"),
          endMode: String(formData.get("recurrenceEndMode") ?? "COUNT"),
          count: Number(String(formData.get("recurrenceCount") ?? "1")),
          until: String(formData.get("recurrenceUntil") ?? ""),
        },
      };
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await throwIfNotOk(res);
      const createdEvent = (await res.json()) as EventInput;
      setOpen(false);
      const api = calendarRef.current?.getApi();
      if (api) {
        const visibleStart = api.view.activeStart.toISOString();
        const visibleEnd = api.view.activeEnd.toISOString();
        let inserted = false;
        for (const [key, events] of eventsCacheRef.current.entries()) {
          const [rangeStart, rangeEnd] = key.split("|");
          if (!rangeStart || !rangeEnd) continue;
          if (!eventOverlapsRange(createdEvent, rangeStart, rangeEnd)) continue;
          const next = [...events];
          const exists = next.some((e) => e.id === createdEvent.id);
          if (!exists) {
            next.push(createdEvent);
            eventsCacheRef.current.set(key, next);
            inserted = true;
          }
        }
        // Ensure active range has the new event cached before refetch.
        const activeKey = `${visibleStart}|${visibleEnd}`;
        if (eventOverlapsRange(createdEvent, visibleStart, visibleEnd)) {
          const activeEvents = eventsCacheRef.current.get(activeKey) ?? [];
          if (!activeEvents.some((e) => e.id === createdEvent.id)) {
            eventsCacheRef.current.set(activeKey, [...activeEvents, createdEvent]);
            inserted = true;
          }
        }
        // Keep nearby ranges warm without forcing a full blank/refetch cycle.
        void prefetchAdjacentRanges(visibleStart, visibleEnd);
        // Refetch from source (which now returns cached data instantly).
        if (inserted) {
          api.refetchEvents();
        } else {
          invalidateEventsCache();
          refetchEvents();
        }
      } else {
        invalidateEventsCache();
        refetchEvents();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create session.");
    } finally {
      setSaving(false);
    }
  };

  const handleEventChange = async (arg: EventChangeArg) => {
    setError(null);
    try {
      const startsAt = arg.event.start?.toISOString();
      const endsAt = arg.event.end?.toISOString();
      if (!startsAt || !endsAt) {
        throw new Error("Session start/end is missing after drag action.");
      }
      let scope: "this" | "following" | "all" = "this";
      const recurrenceId =
        (arg.event.extendedProps?.recurrenceId as string | null | undefined) ??
        null;
      if (recurrenceId) {
        const answer = window.prompt(
          "Edit recurrence scope: type this, following, or all",
          "this",
        );
        if (!answer) {
          arg.revert();
          return;
        }
        if (answer === "following" || answer === "all" || answer === "this") {
          scope = answer;
        } else {
          arg.revert();
          setError("Invalid scope. Use this, following, or all.");
          return;
        }
      }
      const res = await fetch(`/api/sessions/${arg.event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt,
          endsAt,
          scope,
          anchorStart: arg.oldEvent.start?.toISOString() ?? startsAt,
        }),
      });
      await throwIfNotOk(res);
      invalidateEventsCache();
      refetchEvents();
    } catch (e) {
      arg.revert();
      setError(e instanceof Error ? e.message : "Unable to reschedule session.");
    }
  };

  const openBlankDialog = () => {
    setError(null);
    const start = new Date();
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDraft(fromRange(start, end, students[0]?.id ?? ""));
    setOpen(true);
  };
  const copyJoinLink = async () => {
    if (!selectedSession?.joinUrl) return;
    await navigator.clipboard.writeText(selectedSession.joinUrl);
    setError("Join link copied to clipboard.");
  };

  const saveMeetingOverride = async (formData: FormData) => {
    if (!selectedSession) return;
    setSavingMeeting(true);
    setError(null);
    try {
      const payload = {
        startsAt: selectedSession.startsAt,
        endsAt: selectedSession.endsAt,
        scope: "this" as const,
        meetingUrl: String(formData.get("meetingUrl") ?? "").trim(),
        meetingCode: String(formData.get("meetingCode") ?? "").trim(),
      };
      const res = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await throwIfNotOk(res);
      setMeetingOpen(false);
      invalidateEventsCache();
      refetchEvents();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to update meeting override.",
      );
    } finally {
      setSavingMeeting(false);
    }
  };
  const updateSessionStatus = async (nextStatus: SessionMeetingDraft["status"]) => {
    if (!selectedSession) return;
    setSavingMeeting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: selectedSession.startsAt,
          endsAt: selectedSession.endsAt,
          scope: "this",
          status: nextStatus,
        }),
      });
      await throwIfNotOk(res);
      setSelectedSession((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      setError(`Session marked ${nextStatus}.`);
      invalidateEventsCache();
      refetchEvents();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to update session status.",
      );
    } finally {
      setSavingMeeting(false);
    }
  };
  const archiveSession = async (scope: "this" | "following" | "all") => {
    if (!selectedSession) return;
    if (
      scope === "all" &&
      !window.confirm(
        "Archive all sessions in this series? This keeps data in the database but hides them from calendar and balance.",
      )
    ) {
      return;
    }
    setSavingMeeting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      await throwIfNotOk(res);
      setMeetingOpen(false);
      invalidateEventsCache();
      refetchEvents();
      setError(
        scope === "this"
          ? "Session archived."
          : scope === "following"
            ? "Following sessions archived."
            : "Series archived.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to archive session.");
    } finally {
      setSavingMeeting(false);
    }
  };

  const fetchEventsRange = async (
    startStr: string,
    endStr: string,
    silent = false,
  ): Promise<EventInput[]> => {
    const res = await fetch(
      `/api/sessions?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`,
    );
    if (!res.ok) {
      if (!silent) await throwIfNotOk(res);
      throw new Error("Failed to fetch sessions.");
    }
    return (await res.json()) as EventInput[];
  };

  const prefetchAdjacentRanges = async (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const spanMs = end.getTime() - start.getTime();
    if (!Number.isFinite(spanMs) || spanMs <= 0) return;

    const prevStart = new Date(start.getTime() - spanMs).toISOString();
    const prevEnd = new Date(end.getTime() - spanMs).toISOString();
    const nextStart = new Date(start.getTime() + spanMs).toISOString();
    const nextEnd = new Date(end.getTime() + spanMs).toISOString();

    const ranges: Array<[string, string]> = [
      [prevStart, prevEnd],
      [nextStart, nextEnd],
    ];

    for (const [s, e] of ranges) {
      const key = `${s}|${e}`;
      if (eventsCacheRef.current.has(key)) continue;
      try {
        const events = await fetchEventsRange(s, e, true);
        eventsCacheRef.current.set(key, events);
      } catch {
        // Prefetch is best-effort only.
      }
    }
  };

  const prefetchAtStartup = async (startStr: string, endStr: string) => {
    const key = `${startStr}|${endStr}`;
    if (!eventsCacheRef.current.has(key)) {
      try {
        const events = await fetchEventsRange(startStr, endStr, true);
        eventsCacheRef.current.set(key, events);
      } catch {
        // Startup prefetch should never block rendering.
      }
    }
    await prefetchAdjacentRanges(startStr, endStr);
  };

  const apiProvider = (
    _fetchInfo: { startStr: string; endStr: string },
    successCallback: (events: EventInput[]) => void,
    failureCallback: (error: Error) => void,
  ) => {
    const key = `${_fetchInfo.startStr}|${_fetchInfo.endStr}`;
    const cached = eventsCacheRef.current.get(key);
    if (cached) {
      successCallback(cached);
      return;
    }

    fetchEventsRange(_fetchInfo.startStr, _fetchInfo.endStr)
      .then((events) => {
        eventsCacheRef.current.set(key, events);
        successCallback(events);
        void prefetchAdjacentRanges(_fetchInfo.startStr, _fetchInfo.endStr);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to fetch sessions.";
        setError(message);
        failureCallback(new Error(message));
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-card-foreground">Calendar</h1>
        <div className="flex gap-2">
          <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Session meeting</DialogTitle>
              </DialogHeader>
              {selectedSession ? (
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.joinUrl ? (
                      <Button asChild>
                        <a
                          href={selectedSession.joinUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Join VooV
                        </a>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No join link yet. Configure PMR in Settings or add override
                        below.
                      </p>
                    )}
                    {selectedSession.joinUrl ? (
                      <Button type="button" variant="outline" onClick={copyJoinLink}>
                        Copy link
                      </Button>
                    ) : null}
                  </div>
                  <form action={saveMeetingOverride} className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="meetingUrl">Meeting URL override</Label>
                      <Input
                        id="meetingUrl"
                        name="meetingUrl"
                        defaultValue={selectedSession.meetingUrl}
                        placeholder="Leave empty to use PMR"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="meetingCode">Meeting code override</Label>
                      <Input
                        id="meetingCode"
                        name="meetingCode"
                        defaultValue={selectedSession.meetingCode}
                        placeholder="Optional"
                      />
                    </div>
                    <Button type="submit" disabled={savingMeeting}>
                      {savingMeeting ? "Saving..." : "Save override"}
                    </Button>
                  </form>
                  <div className="grid gap-2 rounded-md border border-border p-3">
                    <p className="text-sm font-medium text-card-foreground">
                      Session lifecycle
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current status: {selectedSession.status}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={
                          selectedSession.status === "SCHEDULED"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => updateSessionStatus("SCHEDULED")}
                        disabled={savingMeeting}
                      >
                        Scheduled
                      </Button>
                      <Button
                        type="button"
                        variant={
                          selectedSession.status === "COMPLETED"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => updateSessionStatus("COMPLETED")}
                        disabled={savingMeeting}
                      >
                        Completed
                      </Button>
                      <Button
                        type="button"
                        variant={
                          selectedSession.status === "CANCELLED_BY_TUTOR"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => updateSessionStatus("CANCELLED_BY_TUTOR")}
                        disabled={savingMeeting}
                      >
                        Cancelled by tutor
                      </Button>
                      <Button
                        type="button"
                        variant={
                          selectedSession.status === "CANCELLED_BY_STUDENT"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => updateSessionStatus("CANCELLED_BY_STUDENT")}
                        disabled={savingMeeting}
                      >
                        Cancelled by student
                      </Button>
                      <Button
                        type="button"
                        variant={
                          selectedSession.status === "NO_SHOW"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => updateSessionStatus("NO_SHOW")}
                        disabled={savingMeeting}
                      >
                        No-show
                      </Button>
                    </div>
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => archiveSession("this")}
                        disabled={savingMeeting}
                      >
                        Archive this session
                      </Button>
                      {selectedSession.recurrenceId ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => archiveSession("following")}
                            disabled={savingMeeting}
                          >
                            Archive following
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => archiveSession("all")}
                            disabled={savingMeeting}
                          >
                            Archive all in series
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" onClick={openBlankDialog}>
              Book session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book Session</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="grid gap-4 pt-2">
              <div className="grid gap-2">
                <Label htmlFor="studentId">Student</Label>
                <select
                  id="studentId"
                  name="studentId"
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                  value={draft.studentId}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, studentId: e.target.value }))
                  }
                  required
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Math"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startsAt">Start</Label>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, startsAt: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endsAt">End</Label>
                <Input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, endsAt: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recurrenceFreq">Recurrence</Label>
                <select
                  id="recurrenceFreq"
                  name="recurrenceFreq"
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                  value={draft.recurrenceFreq}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      recurrenceFreq: e.target.value as "NONE" | "WEEKLY",
                    }))
                  }
                >
                  <option value="NONE">Does not repeat</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
              {draft.recurrenceFreq === "WEEKLY" ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="recurrenceEndMode">Repeat ends by</Label>
                    <select
                      id="recurrenceEndMode"
                      name="recurrenceEndMode"
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                      value={draft.recurrenceEndMode}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          recurrenceEndMode: e.target.value as "COUNT" | "UNTIL",
                        }))
                      }
                    >
                      <option value="COUNT">Occurrences</option>
                      <option value="UNTIL">Until date</option>
                    </select>
                  </div>
                  {draft.recurrenceEndMode === "COUNT" ? (
                    <div className="grid gap-2">
                      <Label htmlFor="recurrenceCount">Occurrences</Label>
                      <Input
                        id="recurrenceCount"
                        name="recurrenceCount"
                        type="number"
                        min="2"
                        max="52"
                        value={draft.recurrenceCount}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            recurrenceCount: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor="recurrenceUntil">Until</Label>
                      <Input
                        id="recurrenceUntil"
                        name="recurrenceUntil"
                        type="datetime-local"
                        value={draft.recurrenceUntil}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            recurrenceUntil: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input type="hidden" name="recurrenceEndMode" value="COUNT" />
                  <input type="hidden" name="recurrenceCount" value="1" />
                  <input type="hidden" name="recurrenceUntil" value="" />
                </>
              )}
              <Button type="submit" disabled={saving || students.length === 0}>
                {saving ? "Saving..." : "Save session"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="rounded-[var(--radius)] border border-border bg-card p-3">
        {calendarReady ? (
        <FullCalendar
          ref={calendarRef}
          plugins={[
            interactionPlugin,
            timeGridPlugin,
            dayGridPlugin,
            multiMonthPlugin,
          ]}
          initialView={persistedView}
          initialDate={initialDate}
          selectable
          editable
          eventResizableFromStart
          weekends
          height="auto"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right:
              "timeGridDay,timeGridWeek,dayGridMonth,multiMonthYear",
          }}
          buttonText={{
            timeGridDay: "Day",
            timeGridWeek: "Week",
            dayGridMonth: "Month",
            multiMonthYear: "Year",
          }}
          selectMirror
          select={handleSelect}
          events={apiProvider}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
          eventClick={(arg) => {
            const ext = arg.event.extendedProps as Record<string, unknown>;
            setSelectedSession({
              id: arg.event.id,
              title: arg.event.title,
              recurrenceId:
                (ext.recurrenceId as string | null | undefined) ?? null,
              joinUrl: (ext.joinUrl as string | null | undefined) ?? null,
              meetingUrl: (ext.meetingUrl as string | null | undefined) ?? "",
              meetingCode: (ext.meetingCode as string | null | undefined) ?? "",
              startsAt: arg.event.start?.toISOString() ?? "",
              endsAt: arg.event.end?.toISOString() ?? "",
              status:
                (ext.status as SessionMeetingDraft["status"] | undefined) ??
                "SCHEDULED",
            });
            setMeetingOpen(true);
          }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          datesSet={(arg) => {
            window.sessionStorage.setItem(
              "dashboard-calendar-state",
              JSON.stringify({
                view: arg.view.type,
                date: arg.start.toISOString(),
              }),
            );
            void prefetchAtStartup(arg.startStr, arg.endStr);
          }}
        />
        ) : null}
      </div>
    </div>
  );
}
