import { describe, expect, it } from 'vitest';
import { formatDateToYYYYMMDD, formatDuration, formatTime } from './activityUtils';

describe('formatDuration', () => {
  it('formats hours, minutes and seconds', () => {
    expect(formatDuration(3 * 3600_000 + 25 * 60_000 + 10_000)).toBe('3h 25m 10s');
  });

  it('omits zero-valued larger units', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(5 * 60_000)).toBe('5m');
  });

  it('falls back to "0s" for zero duration', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('clamps negative durations to zero', () => {
    expect(formatDuration(-1000)).toBe('0s');
  });
});

describe('formatDateToYYYYMMDD', () => {
  it('zero-pads month and day', () => {
    expect(formatDateToYYYYMMDD(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles the end of the year', () => {
    expect(formatDateToYYYYMMDD(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('formatTime', () => {
  it('returns "N/A" for missing input', () => {
    expect(formatTime(undefined)).toBe('N/A');
    expect(formatTime(null)).toBe('N/A');
  });

  it('formats a Date using locale time', () => {
    const date = new Date(2026, 0, 1, 13, 30, 0);
    expect(formatTime(date)).toBe(date.toLocaleTimeString());
  });
});
