// Pure, client-safe formatting helpers and shared types for activity data.
// Session calculation itself lives in lib/activityService.ts (server-only, uses Prisma).

export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTime = (date: Date | undefined | null): string => {
  if (!date) return 'N/A';
  return date.toLocaleTimeString();
};

export const formatDuration = (ms: number): string => {
  if (ms < 0) ms = 0;
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  const parts: string[] = [];
  if (hours > 0) parts.push(hours + 'h');
  if (minutes > 0) parts.push(minutes + 'm');
  if (seconds > 0 || parts.length === 0) parts.push(seconds + 's');
  return parts.join(' ');
};

export interface WorkSession {
  startTime: string;
  endTime: string;
  duration: string;
  durationMs: number;
}

export interface ActivityData {
  workSessions: WorkSession[];
  totalActiveMs: number;
  activityChanges: number;
}
