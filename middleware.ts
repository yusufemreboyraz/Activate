export { auth as middleware } from '@/auth';

// Run on everything except Next's static build output. Which paths are public
// is decided in auth.config.ts (authorized callback), not by guessing from the
// path's shape.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
