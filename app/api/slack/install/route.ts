import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { OAUTH_STATE_COOKIE, SLACK_BOT_SCOPES, slackRedirectUri } from '@/lib/slackConfig';

// Starts the "Add to Slack" flow. Admin-only; the random state is bound to the
// admin's browser by a short-lived cookie and checked in the callback.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: 'SLACK_CLIENT_ID is not set' }, { status: 500 });

  const state = crypto.randomBytes(32).toString('hex');
  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', SLACK_BOT_SCOPES.join(','));
  url.searchParams.set('redirect_uri', slackRedirectUri());
  url.searchParams.set('state', state);

  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/slack',
    maxAge: 10 * 60,
  });
  return response;
}
