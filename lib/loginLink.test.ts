import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/test/db';
import { consumeLoginLink, createLoginLink, LOGIN_LINK_TTL_MS } from './loginLink';

beforeEach(async () => {
  await prisma.loginLink.deleteMany();
});
afterAll(async () => {
  await prisma.loginLink.deleteMany();
  await prisma.$disconnect();
});

describe('login links', () => {
  it('signs in once, then never again', async () => {
    const token = await createLoginLink('Ayse@Example.com', 'U1');
    expect(await consumeLoginLink(token)).toBe('ayse@example.com');
    expect(await consumeLoginLink(token)).toBeNull();
  });

  it('stores only a hash of the token', async () => {
    const token = await createLoginLink('a@example.com', 'U1');
    const row = await prisma.loginLink.findFirstOrThrow();
    expect(row.tokenHash).not.toContain(token);
    expect(JSON.stringify(row)).not.toContain(token);
  });

  it('expires after ten minutes', async () => {
    const t0 = new Date('2026-03-10T10:00:00Z');
    const token = await createLoginLink('a@example.com', 'U1', t0);
    expect(await consumeLoginLink(token, new Date(t0.getTime() + LOGIN_LINK_TTL_MS + 1000))).toBeNull();
  });

  it('rejects malformed and unknown tokens', async () => {
    expect(await consumeLoginLink('nope')).toBeNull();
    expect(await consumeLoginLink('x'.repeat(43))).toBeNull();
  });
});
