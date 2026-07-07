"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import timeGridPlugin from "@fullcalendar/timegrid";
import type {
  DateSelectArg,
  EventContentArg,
  EventChangeArg,
  EventInput,
} from "@fullcalendar/core/index.js";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy, replaceTemplate, type Locale } from "@/lib/i18n";

type StudentOption = {
  id: string;
  name: string;
};

type Props = {
  students: StudentOption[];
  locale: Locale;
};

type DraftBooking = {
  studentId: string;
  subject: string;
  notes: string;
  startsAt: string;
  endsAt: string;
  recurrenceFreq: "NONE" | "WEEKLY" | "DAILY";
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
  notes: string;
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
    notes: "",
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

export function SessionCalendar({ students, locale }: Props) {
  const c = copy[locale].dashboard;
  const router = useRouter();
  const statusLabel = (status: SessionMeetingDraft["status"]): string => {
    switch (status) {
      case "SCHEDULED":
        return c.scheduled;
      case "COMPLETED":
        return c.completed;
      case "NO_SHOW":
        return c.noShow;
      case "CANCELLED_BY_TUTOR":
        return c.cancelledByTutor;
      case "CANCELLED_BY_STUDENT":
        return c.cancelledByStudent;
      default:
        return status;
    }
  };
  const focusStartTime = "06:00:00";
  const defaultScrollTime = "08:00:00";
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
  const [isMobile, setIsMobile] = useState(false);
  const [showEarlyHours, setShowEarlyHours] = useState(false);
  const [hiddenEarlyCount, setHiddenEarlyCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
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

  const upsertEventInCaches = (event: EventInput) => {
    const id = event.id;
    if (!id) return;
    for (const [key, events] of eventsCacheRef.current.entries()) {
      const [rangeStart, rangeEnd] = key.split("|");
      if (!rangeStart || !rangeEnd) continue;
      const overlaps = eventOverlapsRange(
        { start: event.start, end: event.end },
        rangeStart,
        rangeEnd,
      );
      const filtered = events.filter((e) => e.id !== id);
      if (overlaps) filtered.push(event);
      eventsCacheRef.current.set(key, filtered);
    }
  };

  const removeEventsFromCaches = (predicate: (event: EventInput) => boolean) => {
    for (const [key, events] of eventsCacheRef.current.entries()) {
      eventsCacheRef.current.set(
        key,
        events.filter((e) => !predicate(e)),
      );
    }
  };

  const refreshActiveRangeAwait = async (throwOnError = false) => {
    const api = calendarRef.current?.getApi();
    if (!api) {
      if (throwOnError) throw new Error("Calendar is not ready.");
      return;
    }
    const startStr = api.view.activeStart.toISOString();
    const endStr = api.view.activeEnd.toISOString();
    try {
      const events = await fetchEventsRange(startStr, endStr, true);
      eventsCacheRef.current.clear();
      eventsCacheRef.current.set(`${startStr}|${endStr}`, events);
      setHiddenEarlyCount(countEarlySessions(events));
      api.refetchEvents();
      void prefetchAdjacentRanges(startStr, endStr);
    } catch (err) {
      if (throwOnError) throw err;
      // Best-effort; keep existing painted events on failure.
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      eventsCacheRef.current.clear();
      try {
        window.sessionStorage.removeItem("dashboard-calendar-cache");
      } catch {
        // ignore storage errors
      }
      await refreshActiveRangeAwait(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh calendar.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreate = async (formData: FormData) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        studentId: String(formData.get("studentId") ?? "").trim(),
        subject: String(formData.get("subject") ?? "").trim() || "English",
        notes: String(formData.get("notes") ?? "").trim(),
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
          // New event sits outside any cached range (e.g., far-future date).
          // Await a fresh fetch for the active view before refetching to
          // avoid a blank flash from clearing the cache pre-emptively.
          await refreshActiveRangeAwait();
        }
      } else {
        await refreshActiveRangeAwait();
      }
      router.refresh();
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
      const updated = (await res.json()) as EventInput;
      if (scope === "this") {
        upsertEventInCaches(updated);
        refetchEvents();
      } else {
        // Multiple sessions in the series shifted; refresh active range from
        // server first so refetchEvents has fresh cache and never paints blank.
        await refreshActiveRangeAwait();
      }
      router.refresh();
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
    setError(c.joinLinkCopied);
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
        notes: String(formData.get("notes") ?? "").trim(),
      };
      const res = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await throwIfNotOk(res);
      const updated = (await res.json()) as EventInput;
      setMeetingOpen(false);
      upsertEventInCaches(updated);
      refetchEvents();
      router.refresh();
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
      const updated = (await res.json()) as EventInput;
      setSelectedSession((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      setError(replaceTemplate(c.markedAs, { status: statusLabel(nextStatus) }));
      upsertEventInCaches(updated);
      refetchEvents();
      // Server-rendered KPI/Students panel computes consumed/remaining hours.
      // Refresh in the background so the right-side rail reflects the new
      // balance without unmounting the calendar (no flicker).
      router.refresh();
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
      const archivedId = selectedSession.id;
      const archivedRecurrenceId = selectedSession.recurrenceId;
      const archivedStartIso = selectedSession.startsAt;
      const res = await fetch(`/api/sessions/${archivedId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      await throwIfNotOk(res);
      setMeetingOpen(false);
      if (scope === "this" || !archivedRecurrenceId) {
        removeEventsFromCaches((e) => e.id === archivedId);
        refetchEvents();
      } else if (scope === "all") {
        removeEventsFromCaches(
          (e) =>
            (e.extendedProps as Record<string, unknown> | undefined)
              ?.recurrenceId === archivedRecurrenceId,
        );
        refetchEvents();
      } else {
        const archivedStartMs = new Date(archivedStartIso).getTime();
        removeEventsFromCaches((e) => {
          const ext = e.extendedProps as Record<string, unknown> | undefined;
          if (ext?.recurrenceId !== archivedRecurrenceId) return false;
          const startMs =
            e.start instanceof Date
              ? e.start.getTime()
              : new Date(e.start as string).getTime();
          return Number.isFinite(startMs) && startMs >= archivedStartMs;
        });
        refetchEvents();
      }
      setError(
        scope === "this"
          ? c.sessionArchived
          : scope === "following"
            ? c.followingArchived
            : c.seriesArchived,
      );
      // Archived sessions stop counting toward consumed hours; refresh the
      // server-rendered rail so balances update immediately.
      router.refresh();
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

  const countEarlySessions = (events: EventInput[]): number =>
    events.reduce((count, event) => {
      const start = event.start;
      if (!start) return count;
      const startDate =
        start instanceof Date ? start : new Date(start as string | number);
      if (!Number.isFinite(startDate.getTime())) return count;
      return startDate.getHours() < 6 ? count + 1 : count;
    }, 0);

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
      setHiddenEarlyCount(countEarlySessions(cached));
      successCallback(cached);
      return;
    }

    fetchEventsRange(_fetchInfo.startStr, _fetchInfo.endStr)
      .then((events) => {
        eventsCacheRef.current.set(key, events);
        setHiddenEarlyCount(countEarlySessions(events));
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
    <section className="space-y-3" aria-label="Session calendar">
      <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{c.sessionMeeting}</DialogTitle>
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
                          {c.joinVoov}
                        </a>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {c.noJoinLink}
                      </p>
                    )}
                    {selectedSession.joinUrl ? (
                      <Button type="button" variant="outline" onClick={copyJoinLink}>
                        {c.copyLink}
                      </Button>
                    ) : null}
                  </div>
                  <form action={saveMeetingOverride} className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="meetingUrl">{c.meetingUrlOverride}</Label>
                      <Input
                        id="meetingUrl"
                        name="meetingUrl"
                        defaultValue={selectedSession.meetingUrl}
                        placeholder={c.leaveEmptyUsePmr}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="meetingCode">{c.meetingCodeOverride}</Label>
                      <Input
                        id="meetingCode"
                        name="meetingCode"
                        defaultValue={selectedSession.meetingCode}
                        placeholder={c.optional}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notes">{c.noteOptional}</Label>
                      <Input
                        id="notes"
                        name="notes"
                        defaultValue={selectedSession.notes}
                        placeholder={c.notePlaceholder}
                      />
                    </div>
                    <Button type="submit" disabled={savingMeeting}>
                      {savingMeeting ? c.saving : c.saveOverride}
                    </Button>
                  </form>
                  <div className="grid gap-2 rounded-md border border-border p-3">
                    <p className="text-sm font-medium text-card-foreground">
                      {c.lifecycle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.currentStatus.replace("{status}", selectedSession.status)}
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
                        {c.scheduled}
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
                        {c.completed}
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
                        {c.cancelledByTutor}
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
                        {c.cancelledByStudent}
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
                        {c.noShow}
                      </Button>
                    </div>
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => archiveSession("this")}
                        disabled={savingMeeting}
                      >
                        {c.archiveThis}
                      </Button>
                      {selectedSession.recurrenceId ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => archiveSession("following")}
                            disabled={savingMeeting}
                          >
                            {c.archiveFollowing}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => archiveSession("all")}
                            disabled={savingMeeting}
                          >
                            {c.archiveAllSeries}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{c.bookSessionDialog}</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="grid gap-4 pt-2">
              <div className="grid gap-2">
                <Label htmlFor="studentId">{c.student}</Label>
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
                <Label htmlFor="subject">{c.subject}</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder={c.mathPlaceholder}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">{c.noteOptional}</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder={c.notePlaceholder}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startsAt">{c.start}</Label>
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
                <Label htmlFor="endsAt">{c.end}</Label>
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
                <Label htmlFor="recurrenceFreq">{c.recurrence}</Label>
                <select
                  id="recurrenceFreq"
                  name="recurrenceFreq"
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                  value={draft.recurrenceFreq}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      recurrenceFreq: e.target.value as "NONE" | "WEEKLY" | "DAILY",
                    }))
                  }
                >
                  <option value="NONE">{c.doesNotRepeat}</option>
                  <option value="DAILY">{c.daily}</option>
                  <option value="WEEKLY">{c.weekly}</option>
                </select>
              </div>
              {draft.recurrenceFreq !== "NONE" ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="recurrenceEndMode">{c.repeatEndsBy}</Label>
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
                      <option value="COUNT">{c.occurrences}</option>
                      <option value="UNTIL">{c.untilDate}</option>
                    </select>
                  </div>
                  {draft.recurrenceEndMode === "COUNT" ? (
                    <div className="grid gap-2">
                      <Label htmlFor="recurrenceCount">{c.occurrences}</Label>
                      <Input
                        id="recurrenceCount"
                        name="recurrenceCount"
                        type="number"
                        min="2"
                        max={draft.recurrenceFreq === "DAILY" ? "365" : "52"}
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
                      <Label htmlFor="recurrenceUntil">{c.until}</Label>
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
                {saving ? c.saving : c.saveSession}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {!showEarlyHours && hiddenEarlyCount > 0 ? (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          {hiddenEarlyCount} session{hiddenEarlyCount === 1 ? "" : "s"} before
          06:00 hidden in compact view.
          <button
            type="button"
            className="ml-2 font-semibold underline underline-offset-2"
            onClick={() => setShowEarlyHours(true)}
          >
            {c.expandEarlyInline}
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-3 ring-1 ring-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
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
          firstDay={1}
          selectable={!isMobile}
          editable={!isMobile}
          eventResizableFromStart
          weekends
          height="auto"
          slotMinTime={showEarlyHours ? "00:00:00" : focusStartTime}
          scrollTime={showEarlyHours ? "00:00:00" : defaultScrollTime}
          scrollTimeReset={false}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right:
              "refresh,bookSession,toggleEarly timeGridDay,timeGridWeek,dayGridMonth,multiMonthYear",
          }}
          customButtons={{
            refresh: {
              text: refreshing ? c.refreshing : c.refresh,
              click: () => {
                void handleRefresh();
              },
            },
            bookSession: {
              text: c.bookSession,
              click: () => {
                if (isMobile) {
                  setError(c.bookingDisabledMobile);
                  return;
                }
                openBlankDialog();
              },
            },
            toggleEarly: {
              text: showEarlyHours ? c.shrinkEarly : c.expandEarly,
              click: () => {
                setShowEarlyHours((prev) => !prev);
              },
            },
          }}
          buttonText={{
            timeGridDay: c.day,
            timeGridWeek: c.week,
            dayGridMonth: c.month,
            multiMonthYear: c.year,
          }}
          titleFormat={{
            year: "numeric",
            month: "short",
            day: isMobile ? undefined : "numeric",
          }}
          selectMirror
          select={handleSelect}
          events={apiProvider}
          eventContent={(arg: EventContentArg) => {
            const viewType = arg.view.type;
            const showNote = viewType === "timeGridDay" || viewType === "timeGridWeek";
            const notes =
              (arg.event.extendedProps as Record<string, unknown>).notes as
                | string
                | undefined;
            return (
              <div className="fc-note-wrap">
                <div>
                  {arg.timeText ? `${arg.timeText} ` : ""}
                  {arg.event.title}
                  {showNote && notes ? (
                    <span
                      className="fc-note-icon"
                      title={notes}
                      aria-label={notes}
                    >
                      📝
                    </span>
                  ) : null}
                </div>
                {showNote && notes ? (
                  <div className="fc-note-text" title={notes}>
                    {notes}
                  </div>
                ) : null}
              </div>
            );
          }}
          eventClassNames={(arg) => {
            const status = (arg.event.extendedProps as Record<string, unknown>)
              .status;
            return typeof status === "string" ? [`status-${status}`] : [];
          }}
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
              notes: (ext.notes as string | null | undefined) ?? "",
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
    </section>
  );
}
