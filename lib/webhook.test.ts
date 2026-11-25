import crypto from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma, resetDatabase } from '@/test/db';
import { consumeLoginLink } from './loginLink';

const SECRET = 'test-signing-secret';
vi.stubEnv('SLACK_SIGNING_SECRET', SECRET);
vi.stubEnv('APP_BASE_URL', 'https://activate.test');

async function call(body: string, sign = true) {
  const { POST } = await import('@/app/api/slack/webhook/route');
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = 'v0=' + crypto.createHmac('sha256', SECRET).update(`v0:${ts}:${body}`).digest('hex');
  return POST(
    new Request('https://activate.test/api/slack/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-slack-request-timestamp': ts, 'x-slack-signature': sign ? sig : 'v0=bad' },
      body,
    })
  );
}

beforeEach(async () => {
  await resetDatabase();
  await prisma.workspace.create({ data: { id: 'T1', name: 'Test', botToken: 'enc:v1:x:y:z' } });
  await prisma.userStatus.create({ data: { userId: 'U1', workspaceId: 'T1', name: 'Ayşe', email: 'ayse@example.com', presence: 'active', updatedAt: new Date() } });
  await prisma.userStatus.create({ data: { userId: 'U2', workspaceId: 'T1', name: 'Misafir', email: 'guest@example.com', isGuest: true, updatedAt: new Date() } });
});
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
  vi.unstubAllEnvs();
});

describe('/activate', () => {
  it('answers a member with their totals and a one-time sign-in button', async () => {
    const res = await call('command=%2Factivate&team_id=T1&user_id=U1');
    const json = await res.json();
    expect(json.response_type).toBe('ephemeral');
    const button = json.blocks[1].elements[0];
    expect(button.url).toMatch(/^https:\/\/activate\.test\/signin\/link\?t=[A-Za-z0-9_-]{43}$/);
    const token = new URL(button.url).searchParams.get('t')!;
    expect(await consumeLoginLink(token)).toBe('ayse@example.com');
  });

  it('gives a guest the totals but no sign-in link', async () => {
    const json = await (await call('command=%2Factivate&team_id=T1&user_id=U2')).json();
    expect(json.blocks).toBeUndefined();
    expect(await prisma.loginLink.count()).toBe(0);
  });

  it('refuses an unsigned request', async () => {
    expect((await call('command=%2Factivate&team_id=T1&user_id=U1', false)).status).toBe(401);
    expect(await prisma.loginLink.count()).toBe(0);
  });
});
