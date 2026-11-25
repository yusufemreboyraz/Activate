// What the dashboard pages show, built straight from the database. Server-only.
import { prisma } from '@/lib/prisma';
import { addDays, dateStringInZone, dayBounds, startOfWeek } from '@/lib/time';
import { calculateActivityForYear, type HeatmapDay } from '@/lib/activityService';

const MIN = 60_000;

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
}

export interface TeamEvent {
  at: Date;
  userId: string;
  name: string;
  kind: 'active' | 'away';
}

export interface WorkspaceToday {
  date: string;
  nowMin: number;
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

export async function getWorkspaceToday(workspaceId: string, now = new Date()): Promise<WorkspaceToday> {
  const date = dateStringInZone(now);
  const { start, end } = dayBounds(date);

  const [statuses, todayRows, lastClosed] = await Promise.all([
    prisma.userStatus.findMany({ where: { workspaceId, isMember: true } }),
    prisma.activitySession.findMany({
      where: { workspaceId, ...overlapping(start, end) },
      select: { userId: true, startTime: true, endTime: true, id: true },
    }),
    prisma.activitySession.findMany({
      where: { workspaceId, endTime: { not: null } },
      orderBy: { endTime: 'desc' },
      distinct: ['userId'],
      select: { userId: true, endTime: true },
    }),
  ]);

  const rowsByUser = new Map<string, typeof todayRows>();
  for (const row of todayRows) {
    const list = rowsByUser.get(row.userId) ?? [];
    list.push(row);
    rowsByUser.set(row.userId, list);
  }
  const lastSeenByUser = new Map(lastClosed.map((r) => [r.userId, r.endTime]));
  const nameByUser = new Map(statuses.map((s) => [s.userId, s.name]));

  const people: PersonToday[] = statuses.map((s) => {
    const rows = rowsByUser.get(s.userId) ?? [];
    const sessions = clipToDay(rows, start, end, now);
    const open = s.activeSessionId ? rows.find((r) => r.id === s.activeSessionId && !r.endTime) : undefined;
    const presence = presenceOf(s.presence);
    return {
      userId: s.userId,
      name: s.realName || s.name,
      image: s.imageOriginal || null,
      statusText: s.statusText ?? '',
      statusEmoji: s.statusEmoji ?? '',
      isGuest: s.isGuest,
      presence,
      activeSince: presence === 'active' ? open?.startTime ?? null : null,
      lastSeen: lastSeenByUser.get(s.userId) ?? null,
      todayMs: sessions.reduce((sum, x) => sum + x.durationMs, 0),
      sessions,
    };
  });

  // Active people first, then alphabetical. Never by time: the page is not a ranking.
  people.sort(
    (a, b) => Number(b.presence === 'active') - Number(a.presence === 'active') || a.name.localeCompare(b.name, 'tr')
  );

  const events: TeamEvent[] = [];
  for (const row of todayRows) {
    const name = nameByUser.get(row.userId);
    if (!name) continue;
    if (row.startTime >= start && row.startTime <= now) {
      events.push({ at: row.startTime, userId: row.userId, name, kind: 'active' });
    }
    if (row.endTime && row.endTime >= start && row.endTime <= now) {
      events.push({ at: row.endTime, userId: row.userId, name, kind: 'away' });
    }
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  const syncedAt = statuses.reduce<Date | null>((max, s) => (!max || s.updatedAt > max ? s.updatedAt : max), null);

  return {
    date,
    nowMin: (now.getTime() - start.getTime()) / MIN,
    totalMs: people.reduce((sum, p) => sum + p.todayMs, 0),
    activeCount: people.filter((p) => p.presence === 'active').length,
    people,
    events: events.slice(0, 16),
    syncedAt,
  };
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

  const [dayRows, weekRows, lastClosed, year] = await Promise.all([
    prisma.activitySession.findMany({
      where: { userId, workspaceId, ...overlapping(start, end) },
      select: { userId: true, startTime: true, endTime: true, id: true },
    }),
    prisma.activitySession.findMany({
      where: { userId, workspaceId, ...overlapping(weekRange.start, weekRange.end) },
      select: { userId: true, startTime: true, endTime: true },
    }),
    prisma.activitySession.findFirst({
      where: { userId, workspaceId, endTime: { not: null } },
      orderBy: { endTime: 'desc' },
      select: { endTime: true },
    }),
    calculateActivityForYear(userId, workspaceId, Number(date.slice(0, 4)), now),
  ]);

  const sessions = clipToDay(dayRows, start, end, now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const b = dayBounds(d);
    const totalMs = clipToDay(weekRows, b.start, b.end, now).reduce((sum, x) => sum + x.durationMs, 0);
    return { date: d, totalMs };
  });

  const presence = presenceOf(status.presence);
  const open = status.activeSessionId
    ? await prisma.activitySession.findFirst({ where: { id: status.activeSessionId, endTime: null }, select: { startTime: true } })
    : null;

  return {
    person: {
      userId,
      name: status.realName || status.name,
      image: status.imageOriginal || null,
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
    year,
  };
}
