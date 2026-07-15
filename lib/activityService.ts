// Server-only activity calculations (Prisma). Do not import from client components.
import { prisma } from '@/lib/prisma';
import type { ActivitySessionModel as ActivitySession } from '@/lib/generated/prisma/models';
import {
  formatDuration,
  formatTime,
  formatDateToYYYYMMDD,
  type ActivityData,
  type WorkSession,
} from '@/lib/activityUtils';

const dayBounds = (dateString: string): { start: Date; end: Date } => ({
  start: new Date(`${dateString}T00:00:00.000Z`),
  end: new Date(`${dateString}T23:59:59.999Z`),
});

// Computes how much of `sessions` overlaps [dayStart, dayEnd]. Sessions are assumed
// pre-filtered to ones that could plausibly overlap (see the Prisma queries below).
function computeDayActivity(
  sessions: ActivitySession[],
  dayStart: Date,
  dayEnd: Date,
  now: Date
): ActivityData {
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();
  let totalActiveMs = 0;
  const workSessions: WorkSession[] = [];

  for (const session of sessions) {
    const sessionStartMs = session.startTime.getTime();
    const sessionEndMs = (session.endTime ?? now).getTime();

    const effectiveStartMs = Math.max(sessionStartMs, dayStartMs);
    const effectiveEndMs = Math.min(sessionEndMs, dayEndMs);

    if (effectiveEndMs > effectiveStartMs) {
      const durationMs = effectiveEndMs - effectiveStartMs;
      totalActiveMs += durationMs;
      workSessions.push({
        startTime: formatTime(new Date(effectiveStartMs)),
        endTime: formatTime(new Date(effectiveEndMs)),
        duration: formatDuration(durationMs),
        durationMs,
      });
    }
  }

  return {
    workSessions,
    totalActiveMs,
    activityChanges: workSessions.length,
  };
}

export const calculateActivityForDate = async (
  userId: string,
  workspaceId: string,
  targetDateString: string
): Promise<ActivityData> => {
  const { start, end } = dayBounds(targetDateString);

  const sessions = await prisma.activitySession.findMany({
    where: {
      userId,
      workspaceId,
      startTime: { lte: end },
      OR: [{ endTime: null }, { endTime: { gte: start } }],
    },
    orderBy: { startTime: 'asc' },
  });

  return computeDayActivity(sessions, start, end, new Date());
};

export interface HeatmapDay {
  date: string;
  totalActiveMs: number;
  count: number;
}

// Fetches a year's worth of sessions in one query, then buckets them by local
// calendar day in memory — avoids one DB round trip per day of the year.
export const calculateActivityForYear = async (
  userId: string,
  workspaceId: string,
  year: number
): Promise<HeatmapDay[]> => {
  const yearStartDate = new Date(year, 0, 1);
  const yearEndDate = new Date(year, 11, 31);
  const queryStart = dayBounds(formatDateToYYYYMMDD(yearStartDate)).start;
  const queryEnd = dayBounds(formatDateToYYYYMMDD(yearEndDate)).end;

  const sessions = await prisma.activitySession.findMany({
    where: {
      userId,
      workspaceId,
      startTime: { lte: queryEnd },
      OR: [{ endTime: null }, { endTime: { gte: queryStart } }],
    },
    orderBy: { startTime: 'asc' },
  });

  const now = new Date();
  const days: HeatmapDay[] = [];
  const cursor = new Date(yearStartDate);

  while (cursor <= yearEndDate) {
    const dateString = formatDateToYYYYMMDD(cursor);
    const { start, end } = dayBounds(dateString);
    const { totalActiveMs } = computeDayActivity(sessions, start, end, now);
    days.push({
      date: dateString,
      totalActiveMs,
      count: totalActiveMs > 0 ? totalActiveMs / (1000 * 60) : 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};
