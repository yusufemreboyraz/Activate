// Pure state machine deciding what to do with a user's activity session
// when a new Slack presence reading comes in. Extracted from the cron job
// so the start/continue/end logic can be unit tested without Slack or a DB.

export type SessionAction =
  | { type: 'start' }
  | { type: 'continue'; sessionId: string }
  | { type: 'end'; sessionId: string }
  | { type: 'none' };

export function determineSessionAction(params: {
  newPresence: string;
  lastPresence: string;
  activeSessionId: string | null | undefined;
}): SessionAction {
  const { newPresence, lastPresence, activeSessionId } = params;

  if (newPresence === 'active' && lastPresence !== 'active') {
    return { type: 'start' };
  }

  if (newPresence === 'active' && lastPresence === 'active') {
    return activeSessionId ? { type: 'continue', sessionId: activeSessionId } : { type: 'start' };
  }

  if (newPresence !== 'active' && lastPresence === 'active') {
    return activeSessionId ? { type: 'end', sessionId: activeSessionId } : { type: 'none' };
  }

  return { type: 'none' };
}
