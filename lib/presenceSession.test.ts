import { describe, expect, it } from 'vitest';
import { determineSessionAction } from './presenceSession';

const now = new Date('2026-03-10T10:00:00.000Z');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe('determineSessionAction', () => {
  it('starts a session when an active user has none open', () => {
    expect(determineSessionAction({ newPresence: 'active', openSession: null, now })).toEqual({ type: 'start' });
  });

  it('does nothing for an away user with no open session', () => {
    expect(determineSessionAction({ newPresence: 'away', openSession: null, now })).toEqual({ type: 'none' });
  });

  it('continues a recent open session while the user stays active', () => {
    const action = determineSessionAction({
      newPresence: 'active',
      openSession: { id: 's1', lastSeen: minutesAgo(2) },
      now,
    });
    expect(action).toEqual({ type: 'continue', sessionId: 's1' });
  });

  it('ends the session now when the user goes away after a recent reading', () => {
    const action = determineSessionAction({
      newPresence: 'away',
      openSession: { id: 's1', lastSeen: minutesAgo(2) },
      now,
    });
    expect(action).toEqual({ type: 'end', sessionId: 's1', endAt: now });
  });

  it('closes at lastSeen and restarts when readings stopped longer than the gap', () => {
    const lastSeen = minutesAgo(45);
    const action = determineSessionAction({ newPresence: 'active', openSession: { id: 's1', lastSeen }, now });
    expect(action).toEqual({ type: 'restart', sessionId: 's1', endAt: lastSeen });
  });

  it('ends at lastSeen (not now) when the user is away after a long gap', () => {
    const lastSeen = minutesAgo(45);
    const action = determineSessionAction({ newPresence: 'away', openSession: { id: 's1', lastSeen }, now });
    expect(action).toEqual({ type: 'end', sessionId: 's1', endAt: lastSeen });
  });

  it('respects a custom maxGapMs', () => {
    const action = determineSessionAction({
      newPresence: 'active',
      openSession: { id: 's1', lastSeen: minutesAgo(4) },
      now,
      maxGapMs: 3 * 60_000,
    });
    expect(action.type).toBe('restart');
  });
});
