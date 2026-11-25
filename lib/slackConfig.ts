// Slack OAuth settings shared by the install and callback routes.
export const SLACK_BOT_SCOPES = ['users:read', 'commands'];
export const OAUTH_STATE_COOKIE = 'activate_slack_oauth_state';

export function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_BASE_URL is not set');
  return url.replace(/\/+$/, '');
}

export const slackRedirectUri = () => `${baseUrl()}/api/auth/slack/callback`;
