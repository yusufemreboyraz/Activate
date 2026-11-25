import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig, isAdminEmail } from './auth.config';
import { accessibleWorkspaceIds, canAccessWorkspace } from '@/lib/access';
import { consumeLoginLink } from '@/lib/loginLink';
import { prisma } from '@/lib/prisma';

async function mayEnter(email: string): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  return (await accessibleWorkspaceIds(email)).length > 0;
}

// The one-time link from /activate (lib/loginLink.ts). Node-only, so it is not
// part of the edge-safe auth.config.ts used by the middleware.
const slackLink = Credentials({
  id: 'slack-link',
  name: 'Slack bağlantısı',
  credentials: { token: {} },
  async authorize(credentials) {
    const token = typeof credentials?.token === 'string' ? credentials.token : '';
    const email = await consumeLoginLink(token);
    if (!email || !(await mayEnter(email))) return null;
    const status = await prisma.userStatus.findFirst({ where: { email, isMember: true }, select: { realName: true, name: true } });
    return { id: email, email, name: status?.realName || status?.name || email };
  },
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, slackLink],
  callbacks: {
    ...authConfig.callbacks,
    // Runs in the Node route handler (not the edge middleware), so it can
    // look up workspace membership in the database.
    async signIn({ profile, account }) {
      // The link provider already checked the token and membership in authorize().
      if (account?.provider === 'slack-link') return true;
      const p = (profile ?? {}) as Record<string, unknown>;
      const email = typeof p.email === 'string' ? p.email.toLowerCase() : null;
      if (!email || p.email_verified === false) return false;
      const allowed = await mayEnter(email);
      // An audit line for refused sign-ins, so an admin can see who tried.
      if (!allowed) console.warn(`Dashboard sign-in refused for ${email}: not a member of any connected workspace`);
      return allowed;
    },
  },
});

const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });

// Defence in depth for route handlers: the middleware already requires a
// session, but every handler checks again and scopes data to the caller.
export async function requireUser(): Promise<{ email: string } | Response> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  return email ? { email } : unauthorized();
}

export async function requireAdmin(): Promise<Response | null> {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return isAdminEmail(user.email) ? null : Response.json({ error: 'Forbidden' }, { status: 403 });
}

// The caller must be a current, non-guest member of the workspace. Answers 404
// rather than 403 so workspace ids cannot be probed.
export async function requireWorkspaceAccess(workspaceId: string): Promise<{ email: string } | Response> {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!(await canAccessWorkspace(user.email, workspaceId))) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return user;
}
