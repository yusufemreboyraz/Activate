// Server-only activity calculations (Prisma). Do not import from client components.
import { prisma } from '@/lib/prisma';
import type { ActivitySessionModel as ActivitySession } from '@/lib/generated/prisma/models';
import { formatDuration, type ActivityData, type WorkSession } from '@/lib/activityUtils';
import { addDays, appTimeZone, dayBounds, timeInZone } from '@/lib/time';

type SessionLike = Pick<ActivitySession, 'startTime' | 'endTime'>;

// How much of `sessions` overlaps [rangeStart, rangeEnd]. rangeEnd is the last
// millisecond of the range (inclusive), as returned by dayBounds. An open
// session (endTime null) counts up to `now`.
export function computeRangeActivity(
  sessions: SessionLike[],
  rangeStart: Date,
  rangeEnd: Date,
  now: Date,
  timeZone = appTimeZone()
): ActivityData {
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = Math.min(rangeEnd.getTime() + 1, now.getTime());
  let totalActiveMs = 0;
  const workSessions: WorkSession[] = [];

  for (const session of sessions) {
    const effectiveStartMs = Math.max(session.startTime.getTime(), rangeStartMs);
    const effectiveEndMs = Math.min((session.endTime ?? now).getTime(), rangeEndMs);

    if (effectiveEndMs > effectiveStartMs) {
      const durationMs = effectiveEndMs - effectiveStartMs;
      totalActiveMs += durationMs;
      workSessions.push({
        startTime: timeInZone(new Date(effectiveStartMs), timeZone),
        endTime: session.endTime ? timeInZone(new Date(effectiveEndMs), timeZone) : 'şu an',
        duration: formatDuration(durationMs),
        durationMs,
      });
    }
  }

  return { workSessions, totalActiveMs, activityChanges: workSessions.length };
}

function overlapping(start: Date, end: Date) {
  return {
    startTime: { lte: end },
    OR: [{ endTime: null }, { endTime: { gte: start } }],
  };
}

export async function calculateActivityForRange(
  userId: string,
  workspaceId: string,
  fromDate: string,
  toDate: string,
  now = new Date()
): Promise<ActivityData> {
  const { start } = dayBounds(fromDate);
  const { end } = dayBounds(toDate);
  const sessions = await prisma.activitySession.findMany({
    where: { userId, workspaceId, ...overlapping(start, end) },
    orderBy: { startTime: 'asc' },
  });
  return computeRangeActivity(sessions, start, end, now);
}

export const calculateActivityForDate = (
  userId: string,
  workspaceId: string,
  dateString: string,
  now = new Date()
): Promise<ActivityData> => calculateActivityForRange(userId, workspaceId, dateString, dateString, now);

// Today's total for every user of a workspace, in one query.
export async function calculateWorkspaceTotalsForDate(
  workspaceId: string,
  dateString: string,
  now = new Date()
): Promise<Map<string, number>> {
  const { start, end } = dayBounds(dateString);
  const sessions = await prisma.activitySession.findMany({
    where: { workspaceId, ...overlapping(start, end) },
    select: { userId: true, startTime: true, endTime: true },
  });

  const byUser = new Map<string, SessionLike[]>();
  for (const s of sessions) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  const totals = new Map<string, number>();
  for (const [userId, list] of byUser) {
    totals.set(userId, computeRangeActivity(list, start, end, now).totalActiveMs);
  }
  return totals;
}

export interface HeatmapDay {
  date: string;
  totalActiveMs: number;
  count: number;
}

// A year's worth of sessions in one query, bucketed by local calendar day in memory.
export async function calculateActivityForYear(
  userId: string,
  workspaceId: string,
  year: number,
  now = new Date()
): Promise<HeatmapDay[]> {
  const firstDay = `${year}-01-01`;
  const lastDay = `${year}-12-31`;
  const { start } = dayBounds(firstDay);
  const { end } = dayBounds(lastDay);

  const sessions = await prisma.activitySession.findMany({
    where: { userId, workspaceId, ...overlapping(start, end) },
    orderBy: { startTime: 'asc' },
  });

  const days: HeatmapDay[] = [];
  for (let date = firstDay; date <= lastDay; date = addDays(date, 1)) {
    const bounds = dayBounds(date);
    const { totalActiveMs } = computeRangeActivity(sessions, bounds.start, bounds.end, now);
    days.push({ date, totalActiveMs, count: totalActiveMs / (1000 * 60) });
  }
  return days;
}
