// What the dashboard pages show, built straight from the database. Server-only.
import { prisma } from '@/lib/prisma';
import { addDays, dateStringInZone, dayBounds, startOfWeek } from '@/lib/time';
import type { HeatmapDay } from '@/lib/activityService';

const MIN = 60_000;

// Slack presence flickers: a 2-minute "away" between two active readings is
// noise, not a break. Stretches separated by at most this much are shown, and
// counted, as one.
export const MERGE_GAP_MS = 5 * MIN;

export type Presence = 'active' | 'away' | 'unknown';

export interface DaySession {
  start: Date;
  end: Date | null; // null: still going
  startMin: number; // minutes from local midnight, clipped to the day
  endMin: number; // clipped to the day and to now
  durationMs: number; // the part that falls inside the day
}

export interface PersonSummary {
  userId: string;
  name: string;
  image: string | null;
  statusText: string;
  statusEmoji: string;
  isGuest: boolean;
  presence: Presence;
  activeSince: Date | null; // start of the open session
  lastSeen: Date | null; // end of the latest closed session
}

export interface PersonToday extends PersonSummary {
  todayMs: number;
  sessions: DaySession[];
  isYou: boolean;
}

export interface TeamEvent {
  at: Date;
  userId: string;
  name: string;
  kind: 'active' | 'away';
}

export interface WorkspaceToday {
  date: string;
  isToday: boolean;
  nowMin: number | null; // only for today
  totalMs: number;
  activeCount: number;
  people: PersonToday[];
  events: TeamEvent[]; // newest first
  syncedAt: Date | null;
}

interface SessionRow {
  userId: string;
  startTime: Date;
  endTime: Date | null;
}

// Joins one person's stretches whose gap is at most MERGE_GAP_MS.
export function mergeShortGaps<T extends SessionRow>(rows: T[]): SessionRow[] {
  const sorted = [...rows].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const out: SessionRow[] = [];
  for (const row of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.userId === row.userId && prev.endTime && row.startTime.getTime() - prev.endTime.getTime() <= MERGE_GAP_MS) {
      if (!row.endTime || row.endTime > prev.endTime) prev.endTime = row.endTime;
      continue;
    }
    out.push({ userId: row.userId, startTime: row.startTime, endTime: row.endTime });
  }
  return out;
}

function clipToDay(rows: SessionRow[], dayStart: Date, dayEnd: Date, now: Date): DaySession[] {
  const startMs = dayStart.getTime();
  const endMs = Math.min(dayEnd.getTime() + 1, now.getTime());
  const out: DaySession[] = [];
  for (const row of rows) {
    const s = Math.max(row.startTime.getTime(), startMs);
    const e = Math.min((row.endTime ?? now).getTime(), endMs);
    if (e <= s) continue;
    out.push({
      start: row.startTime,
      end: row.endTime,
      startMin: (s - startMs) / MIN,
      endMin: (e - startMs) / MIN,
      durationMs: e - s,
    });
  }
  return out.sort((a, b) => a.startMin - b.startMin);
}

const overlapping = (start: Date, end: Date) => ({
  startTime: { lte: end },
  OR: [{ endTime: null }, { endTime: { gte: start } }],
});

function presenceOf(value: string | null | undefined): Presence {
  return value === 'active' ? 'active' : value === 'away' ? 'away' : 'unknown';
}

export async function getWorkspaceDay(
  workspaceId: string,
  date: string,
  now = new Date(),
  viewerEmail?: string | null
): Promise<WorkspaceToday> {
  const isToday = date === dateStringInZone(now);
  const { start, end } = dayBounds(date);

  const [statuses, dayRows, lastClosed] = await Promise.all([
    prisma.userStatus.findMany({ where: { workspaceId, isMember: true } }),
    prisma.activitySession.findMany({
      where: { workspaceId, ...overlapping(start, end) },
      select: { userId: true, startTime: true, endTime: true },
    }),
    prisma.activitySession.findMany({
      where: { workspaceId, endTime: { not: null } },
      orderBy: { endTime: 'desc' },
      distinct: ['userId'],
      select: { userId: true, endTime: true },
    }),
  ]);

  const rowsByUser = new Map<string, SessionRow[]>();
  for (const row of dayRows) {
    const list = rowsByUser.get(row.userId) ?? [];
    list.push(row);
    rowsByUser.set(row.userId, list);
  }
  for (const [userId, rows] of rowsByUser) rowsByUser.set(userId, mergeShortGaps(rows));
  const lastSeenByUser = new Map(lastClosed.map((r) => [r.userId, r.endTime]));
  const nameByUser = new Map(statuses.map((s) => [s.userId, s.realName || s.name]));
  const you = viewerEmail?.toLowerCase();

  const people: PersonToday[] = statuses.map((s) => {
    const rows = rowsByUser.get(s.userId) ?? [];
    const sessions = clipToDay(rows, start, end, now);
    const open = rows.find((r) => !r.endTime);
    const presence = presenceOf(s.presence);
    return {
      userId: s.userId,
      name: s.realName || s.name,
      image: s.avatarFlat ? null : s.imageOriginal || null,
      statusText: s.statusText ?? '',
      statusEmoji: s.statusEmoji ?? '',
      isGuest: s.isGuest,
      presence,
      activeSince: presence === 'active' && isToday ? open?.startTime ?? null : null,
      lastSeen: lastSeenByUser.get(s.userId) ?? null,
      todayMs: sessions.reduce((sum, x) => sum + x.durationMs, 0),
      sessions,
      isYou: Boolean(you && s.email === you),
    };
  });

  // Today: active people first, then alphabetical. Another day: alphabetical.
  // Never by time: the page is not a ranking.
  people.sort(
    (a, b) =>
      (isToday ? Number(b.presence === 'active') - Number(a.presence === 'active') : 0) || a.name.localeCompare(b.name, 'tr')
  );

  const events: TeamEvent[] = [];
  for (const [userId, rows] of rowsByUser) {
    const name = nameByUser.get(userId);
    if (!name) continue;
    for (const row of rows) {
      if (row.startTime >= start && row.startTime <= end && row.startTime <= now) {
        events.push({ at: row.startTime, userId, name, kind: 'active' });
      }
      if (row.endTime && row.endTime >= start && row.endTime <= end && row.endTime <= now) {
        events.push({ at: row.endTime, userId, name, kind: 'away' });
      }
    }
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  const syncedAt = statuses.reduce<Date | null>((max, s) => (!max || s.updatedAt > max ? s.updatedAt : max), null);

  return {
    date,
    isToday,
    nowMin: isToday ? (now.getTime() - start.getTime()) / MIN : null,
    totalMs: people.reduce((sum, p) => sum + p.todayMs, 0),
    activeCount: isToday ? people.filter((p) => p.presence === 'active').length : people.filter((p) => p.todayMs > 0).length,
    people,
    events: events.slice(0, 16),
    syncedAt,
  };
}

export function getWorkspaceToday(workspaceId: string, now = new Date(), viewerEmail?: string | null) {
  return getWorkspaceDay(workspaceId, dateStringInZone(now), now, viewerEmail);
}

export interface PersonDay {
  person: PersonSummary;
  workspaceId: string;
  date: string;
  isToday: boolean;
  nowMin: number | null; // only for today
  totalMs: number;
  sessions: DaySession[];
  longestMs: number;
  firstStart: Date | null;
  lastEnd: Date | null; // null while a session is still open
  week: { date: string; totalMs: number }[];
  weekTotalMs: number;
  year: HeatmapDay[];
}

export async function getPersonDay(
  userId: string,
  workspaceId: string,
  date: string,
  now = new Date()
): Promise<PersonDay | null> {
  const status = await prisma.userStatus.findUnique({ where: { userId } });
  if (!status || status.workspaceId !== workspaceId) return null;

  const today = dateStringInZone(now);
  const { start, end } = dayBounds(date);
  const weekStart = startOfWeek(date);
  const weekRange = { start: dayBounds(weekStart).start, end: dayBounds(addDays(weekStart, 6)).end };

  const year = date.slice(0, 4);
  const yearRange = { start: dayBounds(`${year}-01-01`).start, end: dayBounds(`${year}-12-31`).end };
  // One query covers the year, the week and the day (a week can straddle New
  // Year, so take the wider of the two ranges).
  const from = weekRange.start < yearRange.start ? weekRange.start : yearRange.start;
  const to = weekRange.end > yearRange.end ? weekRange.end : yearRange.end;

  const [rawRows, lastClosed] = await Promise.all([
    prisma.activitySession.findMany({
      where: { userId, workspaceId, ...overlapping(from, to) },
      select: { userId: true, startTime: true, endTime: true },
    }),
    prisma.activitySession.findFirst({
      where: { userId, workspaceId, endTime: { not: null } },
      orderBy: { endTime: 'desc' },
      select: { endTime: true },
    }),
  ]);
  const rows = mergeShortGaps(rawRows);
  const weekRows = rows;

  const sessions = clipToDay(rows, start, end, now);
  const yearDays: HeatmapDay[] = [];
  for (let d = `${year}-01-01`; d <= `${year}-12-31`; d = addDays(d, 1)) {
    const b = dayBounds(d);
    const totalActiveMs = clipToDay(rows, b.start, b.end, now).reduce((sum, x) => sum + x.durationMs, 0);
    yearDays.push({ date: d, totalActiveMs, count: totalActiveMs / MIN });
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const b = dayBounds(d);
    const totalMs = clipToDay(weekRows, b.start, b.end, now).reduce((sum, x) => sum + x.durationMs, 0);
    return { date: d, totalMs };
  });

  const presence = presenceOf(status.presence);
  const open = rows.find((r) => !r.endTime);

  return {
    person: {
      userId,
      name: status.realName || status.name,
      image: status.avatarFlat ? null : status.imageOriginal || null,
      statusText: status.statusText ?? '',
      statusEmoji: status.statusEmoji ?? '',
      isGuest: status.isGuest,
      presence,
      activeSince: presence === 'active' ? open?.startTime ?? null : null,
      lastSeen: lastClosed?.endTime ?? null,
    },
    workspaceId,
    date,
    isToday: date === today,
    nowMin: date === today ? (now.getTime() - start.getTime()) / MIN : null,
    totalMs: sessions.reduce((sum, x) => sum + x.durationMs, 0),
    sessions,
    longestMs: sessions.reduce((max, x) => Math.max(max, x.durationMs), 0),
    firstStart: sessions[0]?.start ?? null,
    lastEnd: sessions.length === 0 ? null : sessions[sessions.length - 1]!.end,
    week,
    weekTotalMs: week.reduce((sum, d) => sum + d.totalMs, 0),
    year: yearDays,
  };
}
