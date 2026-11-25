// Slack OAuth settings shared by the install and callback routes.
// users:read.email lets dashboard access follow workspace membership (lib/access.ts).
export const SLACK_BOT_SCOPES = ['users:read', 'users:read.email', 'commands'];
export const OAUTH_STATE_COOKIE = 'activate_slack_oauth_state';

export function baseUrl(): string {
  const url = process.env.APP_BASE_URL;
  if (!url) throw new Error('APP_BASE_URL is not set');
  return url.replace(/\/+$/, '');
}

export const slackRedirectUri = () => `${baseUrl()}/api/auth/slack/callback`;
