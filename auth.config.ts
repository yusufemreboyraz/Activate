import type { NextAuthConfig } from 'next-auth';
import Slack from 'next-auth/providers/slack';

// Edge-safe auth configuration (used by middleware.ts and auth.ts).
//
// Dashboard sign-in is "Sign in with Slack". Only people whose Slack email is
// listed in ADMIN_EMAILS (comma-separated) may get in; when SLACK_ALLOWED_TEAM_IDS
// is set, they must also sign in from one of those Slack workspaces.

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return list(process.env.ADMIN_EMAILS).includes(email.toLowerCase());
}

function isAllowedTeam(teamId: unknown): boolean {
  const allowed = list(process.env.SLACK_ALLOWED_TEAM_IDS);
  if (allowed.length === 0) return true;
  return typeof teamId === 'string' && allowed.includes(teamId.toLowerCase());
}

// Paths reachable without a dashboard session. Each of these authenticates
// its own callers (Slack request signatures, the cron secret, OAuth state).
const PUBLIC_PREFIXES = [
  '/api/auth/', // NextAuth itself; /api/auth/slack/callback checks the session on its own
  '/api/cron/',
  '/api/slack/webhook',
  '/api/health',
  '/installation-success',
  '/installation-error',
];

export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  providers: [
    Slack({
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const p = (profile ?? {}) as Record<string, unknown>;
      const email = typeof p.email === 'string' ? p.email : null;
      if (p.email_verified === false) return false;
      const allowed = isAdminEmail(email) && isAllowedTeam(p['https://slack.com/team_id']);
      // An audit line for refused sign-ins, so an admin can see who tried.
      if (!allowed) console.warn(`Dashboard sign-in refused for ${email ?? 'unknown email'}`);
      return allowed;
    },
    authorized({ auth, request: { nextUrl } }) {
      const path = nextUrl.pathname;
      if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;

      // Re-checked on every request so removing someone from ADMIN_EMAILS
      // takes effect without waiting for their session to expire.
      if (auth?.user && isAdminEmail(auth.user.email)) return true;

      if (path.startsWith('/api/')) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return false; // redirect to the sign-in page
    },
  },
} satisfies NextAuthConfig;
