// Turkish formatting for durations, clock times and dates. Pure and client-safe.
import { appTimeZone } from '@/lib/time';

const MIN = 60_000;

// 4sa 12dk · 45dk · 2sa · <1dk · 0dk  (sa = saat, dk = dakika)
export function durationTr(ms: number): string {
  if (ms <= 0) return '0dk';
  if (ms < MIN / 2) return '<1dk';
  // Nearest minute, so a stretch shown as 19:23–19:38 reads 15dk, not 14dk.
  const totalMin = Math.round(ms / MIN);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}sa`;
  return `${h}sa ${m}dk`;
}

// Display form of a duration: a dash for nothing at all.
export function durationShown(ms: number): string {
  return ms <= 0 ? '—' : durationTr(ms);
}

// "4sa 12dk'dır", "2sa'tir", "45dk'dır": the suffix follows the spoken last word
// (dakika → -dır, saat → -tir).
export function durationSinceTr(ms: number): string {
  const d = durationTr(ms);
  if (d === '<1dk' || d === '0dk') return 'az önce';
  return d.endsWith('dk') ? `${d}'dır` : `${d}'tir`;
}

// Hours with zero-padded minutes, for tables: 4:12
export function hoursMinutes(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / MIN));
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, '0')}`;
}

export function clockTr(date: Date, timeZone = appTimeZone()): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

// From a YYYY-MM-DD calendar date (no time zone involved).
function utcDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00Z`);
}

export function weekdayTr(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', weekday: 'long' }).format(utcDate(dateString));
}

export function weekdayShortTr(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', weekday: 'short' }).format(utcDate(dateString));
}

export function dayMonthTr(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(utcDate(dateString));
}

export function dayMonthYearTr(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(utcDate(dateString));
}

export function monthShortTr(monthIndex: number): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', month: 'short' }).format(new Date(Date.UTC(2026, monthIndex, 15)));
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toLocaleUpperCase('tr-TR'))
      .join('') || '?'
  );
}

// Upper case that respects Turkish i/İ and ı/I.
export function upperTr(text: string): string {
  return text.toLocaleUpperCase('tr-TR');
}

export function lowerTr(text: string): string {
  return text.toLocaleLowerCase('tr-TR');
}

// Stable 0..n-1 index from a string, for assigning a person a tile colour.
export function toneOf(id: string, n = 6): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % n;
}
