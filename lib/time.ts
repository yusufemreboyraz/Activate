// Time-zone aware calendar helpers. Pure and client-safe.
//
// Every "day" in Activate is a calendar day in APP_TIMEZONE (default
// Europe/Istanbul), not a UTC day — otherwise a session at 01:30 Istanbul time
// lands on the previous day and day totals are off by three hours.

export const DEFAULT_TIMEZONE = 'Europe/Istanbul';

export function appTimeZone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateString(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

// Offset (ms) of `timeZone` from UTC at the given instant: local = utc + offset.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// The UTC instant of local midnight at the start of `dateString` in `timeZone`.
function zonedMidnight(dateString: string, timeZone: string): Date {
  const m = DATE_RE.exec(dateString);
  if (!m) throw new Error(`Invalid date string: ${dateString}`);
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  let result = guess - tzOffsetMs(new Date(guess), timeZone);
  // Re-check once: the offset can differ on either side of a DST change.
  const corrected = guess - tzOffsetMs(new Date(result), timeZone);
  if (corrected !== result) result = corrected;
  return new Date(result);
}

export function addDays(dateString: string, days: number): string {
  const m = DATE_RE.exec(dateString);
  if (!m) throw new Error(`Invalid date string: ${dateString}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return d.toISOString().slice(0, 10);
}

// [start, end] of a local calendar day, as UTC instants (end is inclusive, last ms).
export function dayBounds(dateString: string, timeZone = appTimeZone()): { start: Date; end: Date } {
  const start = zonedMidnight(dateString, timeZone);
  const next = zonedMidnight(addDays(dateString, 1), timeZone);
  return { start, end: new Date(next.getTime() - 1) };
}

// YYYY-MM-DD of `date` as seen in `timeZone`.
export function dateStringInZone(date: Date, timeZone = appTimeZone()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// HH:mm of `date` as seen in `timeZone`.
export function timeInZone(date: Date, timeZone = appTimeZone()): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

// Monday of the ISO week that contains `dateString`.
export function startOfWeek(dateString: string): string {
  const m = DATE_RE.exec(dateString);
  if (!m) throw new Error(`Invalid date string: ${dateString}`);
  const weekday = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay(); // 0 = Sunday
  return addDays(dateString, -((weekday + 6) % 7));
}
