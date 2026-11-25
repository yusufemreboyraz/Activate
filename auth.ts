import NextAuth from 'next-auth';
import { authConfig, isAdminEmail } from './auth.config';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

// Defence in depth for route handlers: middleware already gates these paths,
// but a handler must not rely on the matcher alone.
export async function requireAdmin(): Promise<Response | null> {
  const session = await auth();
  if (!session?.user || !isAdminEmail(session.user.email)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
