import { describe, expect, it } from 'vitest';
import { authConfig, isAdminEmail } from '@/auth.config';

describe('isAdminEmail', () => {
  it('matches the allowlist case-insensitively and trims entries', () => {
    expect(isAdminEmail('admin@example.com')).toBe(true);
    expect(isAdminEmail('ADMIN@example.com')).toBe(true);
    expect(isAdminEmail('second@example.com')).toBe(true);
    expect(isAdminEmail('someone@example.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });
});

describe('authorized callback', () => {
  const authorized = authConfig.callbacks.authorized;
  const call = (path: string, email?: string) =>
    authorized({
      auth: email ? { user: { email }, expires: '' } : null,
      request: { nextUrl: new URL(`https://activate.test${path}`) },
    } as never);

  it('lets public endpoints through without a session', () => {
    for (const path of ['/api/cron/check-presence', '/api/slack/webhook', '/api/auth/signin', '/api/health']) {
      expect(call(path)).toBe(true);
    }
  });

  it('no longer treats a dot in the path as a public asset', () => {
    expect(call('/users/U123.json')).toBe(false);
  });

  it('returns 401 JSON for API calls without a session', async () => {
    const res = call('/api/workspaces') as Response;
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(401);
  });

  it('rejects a signed-in user who is not on the allowlist', () => {
    expect(call('/', 'intruder@example.com')).toBe(false);
  });

  it('allows an admin', () => {
    expect(call('/', 'admin@example.com')).toBe(true);
    expect(call('/api/slack/install', 'admin@example.com')).toBe(true);
  });

  it('keeps /api/slack/install behind sign-in', () => {
    expect((call('/api/slack/install') as Response).status).toBe(401);
  });
});
