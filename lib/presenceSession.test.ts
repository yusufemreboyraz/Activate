import { describe, expect, it } from 'vitest';
import { determineSessionAction } from './presenceSession';

describe('determineSessionAction', () => {
  it('starts a new session when a user goes away -> active', () => {
    const action = determineSessionAction({
      newPresence: 'active',
      lastPresence: 'away',
      activeSessionId: null,
    });
    expect(action).toEqual({ type: 'start' });
  });

  it('continues the existing session when a user stays active', () => {
    const action = determineSessionAction({
      newPresence: 'active',
      lastPresence: 'active',
      activeSessionId: 'session-1',
    });
    expect(action).toEqual({ type: 'continue', sessionId: 'session-1' });
  });

  it('starts a new session if active but no session id was recorded (edge case)', () => {
    const action = determineSessionAction({
      newPresence: 'active',
      lastPresence: 'active',
      activeSessionId: null,
    });
    expect(action).toEqual({ type: 'start' });
  });

  it('ends the session when a user goes active -> away', () => {
    const action = determineSessionAction({
      newPresence: 'away',
      lastPresence: 'active',
      activeSessionId: 'session-1',
    });
    expect(action).toEqual({ type: 'end', sessionId: 'session-1' });
  });

  it('does nothing when going active -> away with no tracked session', () => {
    const action = determineSessionAction({
      newPresence: 'away',
      lastPresence: 'active',
      activeSessionId: null,
    });
    expect(action).toEqual({ type: 'none' });
  });

  it('does nothing when staying away', () => {
    const action = determineSessionAction({
      newPresence: 'away',
      lastPresence: 'away',
      activeSessionId: null,
    });
    expect(action).toEqual({ type: 'none' });
  });
});
