export type RecurrenceScope = "this" | "following" | "all";

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function expandWeeklyStarts(input: {
  startsAt: Date;
  count: number;
}): Date[] {
  if (input.count <= 1) return [new Date(input.startsAt)];
  return Array.from({ length: input.count }, (_, i) =>
    addDays(input.startsAt, i * 7),
  );
}

export function expandWeeklyStartsUntil(input: {
  startsAt: Date;
  until: Date;
  maxOccurrences?: number;
}): Date[] {
  if (input.until.getTime() < input.startsAt.getTime()) {
    return [new Date(input.startsAt)];
  }
  const out: Date[] = [];
  const max = input.maxOccurrences ?? 104;
  let i = 0;
  while (i < max) {
    const candidate = addDays(input.startsAt, i * 7);
    if (candidate.getTime() > input.until.getTime()) break;
    out.push(candidate);
    i += 1;
  }
  return out.length > 0 ? out : [new Date(input.startsAt)];
}

export function applyDelta(date: Date, deltaMs: number): Date {
  return new Date(date.getTime() + deltaMs);
}
