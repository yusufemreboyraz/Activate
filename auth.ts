import NextAuth from 'next-auth';
import { authConfig, isAdminEmail } from './auth.config';
import { accessibleWorkspaceIds, canAccessWorkspace } from '@/lib/access';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Runs in the Node route handler (not the edge middleware), so it can
    // look up workspace membership in the database.
    async signIn({ profile }) {
      const p = (profile ?? {}) as Record<string, unknown>;
      const email = typeof p.email === 'string' ? p.email.toLowerCase() : null;
      if (!email || p.email_verified === false) return false;
      if (isAdminEmail(email)) return true;
      const allowed = (await accessibleWorkspaceIds(email)).length > 0;
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
