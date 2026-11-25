// Pure state machine deciding what to do with a user's activity session when a
// new Slack presence reading comes in. Kept free of Slack and the database so
// it can be unit tested on its own.
//
// Readings arrive every POLL interval (2 minutes in production). If readings
// stop for longer than maxGapMs — a missed scheduler run, a Slack outage — we
// do not know what the user did in that gap, so an open session is closed at
// the last time we actually saw the user active instead of being stretched
// across the gap.

export const DEFAULT_MAX_GAP_MS = 10 * 60 * 1000;

export type SessionAction =
  | { type: 'start' }
  | { type: 'continue'; sessionId: string }
  | { type: 'end'; sessionId: string; endAt: Date }
  | { type: 'restart'; sessionId: string; endAt: Date }
  | { type: 'none' };

export function determineSessionAction(params: {
  newPresence: string;
  openSession: { id: string; lastSeen: Date } | null | undefined;
  now: Date;
  maxGapMs?: number;
}): SessionAction {
  const { newPresence, openSession, now } = params;
  const maxGapMs = params.maxGapMs ?? DEFAULT_MAX_GAP_MS;
  const isActive = newPresence === 'active';

  if (!openSession) {
    return isActive ? { type: 'start' } : { type: 'none' };
  }

  const gapMs = now.getTime() - openSession.lastSeen.getTime();
  const stale = gapMs > maxGapMs;

  if (isActive) {
    return stale
      ? { type: 'restart', sessionId: openSession.id, endAt: openSession.lastSeen }
      : { type: 'continue', sessionId: openSession.id };
  }

  return { type: 'end', sessionId: openSession.id, endAt: stale ? openSession.lastSeen : now };
}
