import { describe, expect, it } from 'vitest';
import { durationEn, formatter, messages, parseLocale } from './i18n';

const MIN = 60_000;

describe('parseLocale', () => {
  it('accepts tr and en and falls back to Turkish', () => {
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('tr')).toBe('tr');
    expect(parseLocale('de')).toBe('tr');
    expect(parseLocale(undefined)).toBe('tr');
  });
});

describe('durationEn', () => {
  it('prints hours and minutes', () => {
    expect(durationEn(4 * 60 * MIN + 12 * MIN)).toBe('4h 12m');
    expect(durationEn(2 * 60 * MIN)).toBe('2h');
    expect(durationEn(45 * MIN)).toBe('45m');
    expect(durationEn(20_000)).toBe('<1m');
    expect(durationEn(0)).toBe('0m');
  });
});

describe('English formatter and messages', () => {
  const f = formatter('en');
  const t = messages('en');

  it('formats calendar dates in English', () => {
    expect(f.weekday('2026-11-25')).toBe('Wednesday');
    expect(f.dayMonth('2026-11-25')).toBe('25 November');
    expect(f.dayMonthYear('2026-11-25')).toBe('25 November 2026');
    expect(f.monthShort(0)).toBe('Jan');
    expect(f.monthShort(8)).toBe('Sep');
  });

  it('says how long someone has been active', () => {
    expect(t.state.activeFor(66 * MIN)).toBe('active for 1h 6m');
    expect(t.state.activeFor(10_000)).toBe('active just now');
    expect(messages('tr').state.activeFor(47 * MIN)).toBe("47dk'dır aktif");
  });

  it('counts with singular and plural', () => {
    expect(t.people(1)).toBe('1 person');
    expect(t.people(7)).toBe('7 people');
    expect(t.state.sessions(1)).toBe('1 session');
    expect(t.state.sessions(3)).toBe('3 sessions');
  });
});
