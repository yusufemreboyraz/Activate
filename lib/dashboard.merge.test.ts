import { describe, expect, it } from 'vitest';
import { mergeShortGaps } from './dashboard';

const t = (hhmm: string) => new Date(`2026-03-10T${hhmm}:00Z`);
const row = (a: string, b: string | null) => ({ userId: 'U1', startTime: t(a), endTime: b ? t(b) : null });

describe('mergeShortGaps', () => {
  it('joins stretches separated by Slack flicker (≤ 5 min)', () => {
    const out = mergeShortGaps([row('16:23', '16:38'), row('16:40', '18:42')]);
    expect(out).toHaveLength(1);
    expect(out[0]!.startTime).toEqual(t('16:23'));
    expect(out[0]!.endTime).toEqual(t('18:42'));
  });
  it('keeps a real break apart', () => {
    expect(mergeShortGaps([row('09:00', '10:00'), row('10:20', '11:00')])).toHaveLength(2);
  });
  it('carries an open stretch through', () => {
    const out = mergeShortGaps([row('09:00', '10:00'), row('10:03', null)]);
    expect(out).toHaveLength(1);
    expect(out[0]!.endTime).toBeNull();
  });
  it('sorts before merging', () => {
    expect(mergeShortGaps([row('10:03', '11:00'), row('09:00', '10:00')])).toHaveLength(1);
  });
});
