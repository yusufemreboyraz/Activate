import type { NextAuthConfig } from 'next-auth';
import Slack from 'next-auth/providers/slack';

// Edge-safe auth configuration (used by middleware.ts and auth.ts).
//
// Dashboard sign-in is "Sign in with Slack". Anyone whose verified Slack email
// belongs to a member of a connected workspace may sign in (checked in auth.ts,
// which can reach the database); ADMIN_EMAILS (comma-separated) additionally
// may connect workspaces.

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return list(process.env.ADMIN_EMAILS).includes(email.toLowerCase());
}

// Paths reachable without a dashboard session. Each of these authenticates
// its own callers (Slack request signatures, the cron secret, OAuth state).
const PUBLIC_PREFIXES = [
  '/api/auth/', // NextAuth itself; /api/auth/slack/callback checks the session on its own
  '/api/cron/',
  '/api/slack/webhook',
  '/api/health',
  '/signin',
  '/installation-success',
  '/installation-error',
];

export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/signin', error: '/signin' },
  providers: [
    Slack({
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const path = nextUrl.pathname;
      if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;

      // Pages only need a signed-in user; which workspaces they may see is
      // checked against the database in every API route (lib/access.ts).
      if (auth?.user?.email) return true;

      if (path.startsWith('/api/')) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Build the sign-in redirect from the public base URL: behind Cloud Run
      // the standalone server sees its own bind address (0.0.0.0:8080).
      const base = (process.env.APP_BASE_URL ?? nextUrl.origin).replace(/\/+$/, '');
      const callbackUrl = `${base}${path}${nextUrl.search}`;
      return Response.redirect(`${base}/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`, 302);
    },
  },
} satisfies NextAuthConfig;
