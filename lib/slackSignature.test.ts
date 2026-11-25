import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySlackSignature } from './slackSignature';

const secret = 'test-signing-secret';
const body = 'command=%2Factivate&team_id=T1&user_id=U1';
const ts = 1_800_000_000;
const sign = (b: string, t: number) =>
  'v0=' + crypto.createHmac('sha256', secret).update(`v0:${t}:${b}`).digest('hex');

describe('verifySlackSignature', () => {
  it('accepts a valid signature', () => {
    expect(
      verifySlackSignature({ signingSecret: secret, signature: sign(body, ts), timestamp: String(ts), rawBody: body, nowSeconds: ts })
    ).toBe(true);
  });

  it('rejects a modified body', () => {
    expect(
      verifySlackSignature({ signingSecret: secret, signature: sign(body, ts), timestamp: String(ts), rawBody: body + 'x', nowSeconds: ts })
    ).toBe(false);
  });

  it('rejects old and future timestamps (replay)', () => {
    for (const now of [ts + 301, ts - 301]) {
      expect(
        verifySlackSignature({ signingSecret: secret, signature: sign(body, ts), timestamp: String(ts), rawBody: body, nowSeconds: now })
      ).toBe(false);
    }
  });

  it('rejects missing or malformed headers', () => {
    expect(verifySlackSignature({ signingSecret: secret, signature: null, timestamp: String(ts), rawBody: body, nowSeconds: ts })).toBe(false);
    expect(verifySlackSignature({ signingSecret: secret, signature: sign(body, ts), timestamp: 'abc', rawBody: body, nowSeconds: ts })).toBe(false);
    expect(verifySlackSignature({ signingSecret: secret, signature: 'v0=short', timestamp: String(ts), rawBody: body, nowSeconds: ts })).toBe(false);
  });
});
