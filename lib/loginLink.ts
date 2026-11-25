// One-time sign-in links for people already signed in to Slack on a phone.
// /activate (signature-verified, so Slack vouches for the user) hands out a
// link; opening it signs that person in without a Slack web login.
// Tokens are 256-bit, stored only as SHA-256 hashes, valid for 10 minutes and
// usable once. Server-only.
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const LOGIN_LINK_TTL_MS = 10 * 60_000;

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export async function createLoginLink(email: string, userId: string, now = new Date()): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.loginLink.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 24 * 3_600_000) } } });
  await prisma.loginLink.create({
    data: { tokenHash: hash(token), email: email.toLowerCase(), userId, expiresAt: new Date(now.getTime() + LOGIN_LINK_TTL_MS) },
  });
  return token;
}

// Marks the link used and returns its email, or null if it is unknown, expired
// or already used. The conditional update makes a second use lose the race.
export async function consumeLoginLink(token: string, now = new Date()): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const tokenHash = hash(token);
  const { count } = await prisma.loginLink.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (count !== 1) return null;
  const link = await prisma.loginLink.findUnique({ where: { tokenHash }, select: { email: true } });
  return link?.email ?? null;
}
