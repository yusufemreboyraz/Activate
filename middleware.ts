import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Edge-safe instance: only the session check from auth.config.ts. auth.ts adds
// database lookups (lib/access.ts) that cannot run in the edge runtime.
export const { auth: middleware } = NextAuth(authConfig);

// Run on everything except Next's static build output. Which paths are public
// is decided in auth.config.ts (authorized callback), not by guessing from the
// path's shape.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)'],
};
