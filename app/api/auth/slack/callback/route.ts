import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isAdminEmail } from '@/auth.config';
import { encryptToken, safeEqual } from '@/lib/tokenCrypto';
import { baseUrl, OAUTH_STATE_COOKIE, slackRedirectUri } from '@/lib/slackConfig';

function fail(code: string) {
  const response = NextResponse.redirect(
    `${baseUrl()}/installation-error?error=${encodeURIComponent(code)}`
  );
  response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: '/api/auth/slack' });
  return response;
}

// Slack "Add to Slack" OAuth callback. Requires a signed-in admin and the
// state issued by /api/slack/install, so nobody else can attach a workspace.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !isAdminEmail(session.user.email)) return fail('not_signed_in');

  const params = request.nextUrl.searchParams;
  const slackError = params.get('error');
  if (slackError) return fail(slackError === 'access_denied' ? 'access_denied' : 'slack_error');

  const code = params.get('code');
  const state = params.get('state');
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code) return fail('no_code');
  if (!state || !expectedState || !safeEqual(state, expectedState)) return fail('invalid_state');

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('config_error');

  try {
    const res = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: slackRedirectUri(),
      }),
    });
    const data = await res.json();

    if (!data.ok || data.token_type !== 'bot' || !data.access_token || !data.team?.id) {
      console.error('Slack OAuth token exchange failed:', data.error ?? 'unexpected response');
      return fail('token_exchange_failed');
    }

    const allowedTeams = (process.env.SLACK_ALLOWED_TEAM_IDS ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (allowedTeams.length > 0 && !allowedTeams.includes(data.team.id)) {
      return fail('team_not_allowed');
    }

    const fields = {
      name: String(data.team.name ?? data.team.id),
      botToken: encryptToken(data.access_token),
      appId: data.app_id ?? null,
      botUserId: data.bot_user_id ?? null,
      scopes: data.scope ?? null,
      status: 'active',
    };
    await prisma.workspace.upsert({
      where: { id: data.team.id },
      create: { id: data.team.id, ...fields },
      update: fields,
    });
    console.log(`Slack workspace installed: ${data.team.id}`);

    const response = NextResponse.redirect(
      `${baseUrl()}/installation-success?workspace=${encodeURIComponent(fields.name)}`
    );
    response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: '/api/auth/slack' });
    return response;
  } catch (err) {
    console.error('Slack OAuth callback error:', err);
    return fail('oauth_exception');
  }
}
