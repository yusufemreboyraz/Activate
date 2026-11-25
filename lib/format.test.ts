import { describe, expect, it } from 'vitest';
import { dayMonthTr, durationSinceTr, durationTr, hoursMinutes, initials, lowerTr, toneOf, upperTr, weekdayTr } from './format';

const MIN = 60_000;

describe('durationTr', () => {
  it('uses sa and dk, never ambiguous s', () => {
    expect(durationTr(4 * 60 * MIN + 12 * MIN)).toBe('4sa 12dk');
    expect(durationTr(2 * 60 * MIN)).toBe('2sa');
    expect(durationTr(45 * MIN)).toBe('45dk');
  });
  it('shows <1dk for seconds and 0dk for nothing', () => {
    expect(durationTr(20_000)).toBe('<1dk');
    expect(durationTr(14 * MIN + 40_000)).toBe('15dk');
    expect(durationTr(0)).toBe('0dk');
    expect(durationTr(-5)).toBe('0dk');
  });
  it('does not wrap past 24 hours', () => {
    expect(durationTr(37 * 60 * MIN + 5 * MIN)).toBe('37sa 5dk');
  });
});

describe('durationSinceTr', () => {
  it('picks the suffix from the spoken last word', () => {
    expect(durationSinceTr(47 * MIN)).toBe("47dk'dır");
    expect(durationSinceTr(2 * 60 * MIN)).toBe("2sa'tir");
    expect(durationSinceTr(90 * MIN)).toBe("1sa 30dk'dır");
    expect(durationSinceTr(10_000)).toBe('az önce');
  });
});

describe('dates and names', () => {
  it('formats Turkish weekdays and dates', () => {
    expect(weekdayTr('2026-11-25')).toBe('Çarşamba');
    expect(dayMonthTr('2026-11-25')).toBe('25 Kasım');
  });
  it('pads table hours', () => {
    expect(hoursMinutes(4 * 60 * MIN + 5 * MIN)).toBe('4:05');
  });
  it('respects Turkish case', () => {
    expect(upperTr('irem')).toBe('İREM');
    expect(lowerTr('IŞIK')).toBe('ışık');
    expect(initials('İrem Güneş')).toBe('İG');
  });
  it('gives a person a stable tone', () => {
    expect(toneOf('U123')).toBe(toneOf('U123'));
    expect(toneOf('U123')).toBeLessThan(6);
  });
});
