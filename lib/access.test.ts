import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma, resetDatabase } from '@/test/db';
import { accessibleWorkspaceIds, canAccessWorkspace } from './access';

// Route handlers call auth(); stand in for NextAuth with a switchable session.
let sessionEmail: string | null = null;
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: { GET: () => null, POST: () => null },
    auth: async () => (sessionEmail ? { user: { email: sessionEmail }, expires: '' } : null),
    signIn: async () => null,
    signOut: async () => null,
  }),
}));

async function member(userId: string, workspaceId: string, email: string | null, extra: object = {}) {
  await prisma.userStatus.create({
    data: { userId, workspaceId, name: userId, email, updatedAt: new Date(), ...extra },
  });
}

beforeEach(async () => {
  sessionEmail = null;
  await resetDatabase();
  for (const [id, name, status] of [
    ['T_NORTHWIND', 'Northwind', 'active'],
    ['T_ACME', 'Acme', 'active'],
    ['T_OTHER', 'Other', 'active'],
    ['T_OFF', 'Disconnected', 'inactive'],
  ]) {
    await prisma.workspace.create({ data: { id, name, botToken: 'enc:v1:x:y:z', status } });
  }
  await member('U_ME_K', 'T_NORTHWIND', 'me@example.com');
  await member('U_ME_W', 'T_ACME', 'me@example.com');
  await member('U_ME_OFF', 'T_OFF', 'me@example.com');
  await member('U_ALI_K', 'T_NORTHWIND', 'ali@example.com');
  await member('U_GUEST_O', 'T_OTHER', 'guest@example.com', { isGuest: true });
  await member('U_GONE_O', 'T_OTHER', 'gone@example.com', { isMember: false });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('accessibleWorkspaceIds', () => {
  it('returns every active workspace the email is a member of', async () => {
    expect((await accessibleWorkspaceIds('me@example.com')).sort()).toEqual(['T_ACME', 'T_NORTHWIND']);
  });

  it('matches emails case-insensitively', async () => {
    expect(await accessibleWorkspaceIds('ME@Example.COM')).toHaveLength(2);
  });

  it('gives guests and former members nothing', async () => {
    expect(await accessibleWorkspaceIds('guest@example.com')).toEqual([]);
    expect(await accessibleWorkspaceIds('gone@example.com')).toEqual([]);
  });

  it('gives unknown or missing emails nothing', async () => {
    expect(await accessibleWorkspaceIds('stranger@example.com')).toEqual([]);
    expect(await accessibleWorkspaceIds(null)).toEqual([]);
  });

  it('checks a single workspace', async () => {
    expect(await canAccessWorkspace('ali@example.com', 'T_NORTHWIND')).toBe(true);
    expect(await canAccessWorkspace('ali@example.com', 'T_ACME')).toBe(false);
  });
});

describe('API routes are scoped to the caller', () => {
  it('lists only the caller\'s workspaces', async () => {
    const { GET } = await import('@/app/api/workspaces/route');
    sessionEmail = 'ali@example.com';
    const body = await (await GET()).json();
    expect(body.map((w: { workspace_id: string }) => w.workspace_id)).toEqual(['T_NORTHWIND']);
  });

  it('answers 401 without a session', async () => {
    const { GET } = await import('@/app/api/workspaces/route');
    expect((await GET()).status).toBe(401);
  });

  it('serves a workspace\'s members to a member and 404 to anyone else', async () => {
    const { GET } = await import('@/app/api/user-statuses/route');
    const req = (ws: string) => new NextRequest(`https://x.test/api/user-statuses?workspaceId=${ws}`);

    sessionEmail = 'ali@example.com';
    const ok = await GET(req('T_NORTHWIND'));
    expect(ok.status).toBe(200);
    expect((await ok.json()).map((u: { user_id: string }) => u.user_id).sort()).toEqual(['U_ALI_K', 'U_ME_K']);

    expect((await GET(req('T_ACME'))).status).toBe(404);
    expect((await GET(req('T_OTHER'))).status).toBe(404);
  });

  it('hides a single user from people outside their workspace', async () => {
    const { GET } = await import('@/app/api/user-statuses/[userId]/route');
    const call = (userId: string) =>
      GET(new Request('https://x.test'), { params: Promise.resolve({ userId }) });

    sessionEmail = 'ali@example.com';
    expect((await call('U_ME_K')).status).toBe(200);
    expect((await call('U_ME_W')).status).toBe(404);
  });

  it('refuses activity for a workspace the caller is not in', async () => {
    const { GET } = await import('@/app/api/activity/route');
    sessionEmail = 'ali@example.com';
    const res = await GET(
      new NextRequest('https://x.test/api/activity?userId=U_ME_W&workspaceId=T_ACME&date=2026-11-25')
    );
    expect(res.status).toBe(404);
  });

  it('keeps connecting workspaces admin-only', async () => {
    vi.stubEnv('SLACK_CLIENT_ID', '123.456');
    vi.stubEnv('APP_BASE_URL', 'https://activate.test');
    const { GET } = await import('@/app/api/slack/install/route');
    sessionEmail = 'ali@example.com';
    expect((await GET()).status).toBe(403);
    sessionEmail = 'admin@example.com';
    const res = await GET();
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('scope=users%3Aread%2Cusers%3Aread.email%2Ccommands');
    vi.unstubAllEnvs();
  });
});
