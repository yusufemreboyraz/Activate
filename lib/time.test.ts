import { describe, expect, it } from 'vitest';
import { addDays, dateStringInZone, dayBounds, isDateString, startOfWeek, timeInZone } from './time';

describe('dayBounds', () => {
  it('uses Istanbul midnight (UTC+3), not UTC midnight', () => {
    const { start, end } = dayBounds('2026-03-10', 'Europe/Istanbul');
    expect(start.toISOString()).toBe('2026-03-09T21:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-10T20:59:59.999Z');
  });

  it('handles a 23-hour DST day', () => {
    const { start, end } = dayBounds('2026-03-29', 'Europe/Berlin');
    expect(start.toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(end.getTime() - start.getTime() + 1).toBe(23 * 3600_000);
  });
});

describe('dateStringInZone / timeInZone', () => {
  it('puts 22:30 UTC on the next Istanbul day', () => {
    const instant = new Date('2026-03-10T22:30:00.000Z');
    expect(dateStringInZone(instant, 'Europe/Istanbul')).toBe('2026-03-11');
    expect(timeInZone(instant, 'Europe/Istanbul')).toBe('01:30');
  });
});

describe('calendar helpers', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds the Monday of the week', () => {
    expect(startOfWeek('2026-11-25')).toBe('2026-11-23'); // Wednesday
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23'); // Sunday
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23'); // Monday
  });

  it('validates date strings', () => {
    expect(isDateString('2026-02-28')).toBe(true);
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('2026-2-3')).toBe(false);
    expect(isDateString("2026-01-01' OR 1=1")).toBe(false);
  });
});
