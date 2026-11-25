import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, safeEqual } from './tokenCrypto';

describe('token encryption', () => {
  it('round-trips and never stores the plain token', () => {
    const stored = encryptToken('xoxb-secret-token');
    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(stored).not.toContain('xoxb');
    expect(decryptToken(stored)).toBe('xoxb-secret-token');
  });

  it('uses a fresh IV each time', () => {
    expect(encryptToken('same')).not.toBe(encryptToken('same'));
  });

  it('rejects tampered ciphertext', () => {
    const stored = encryptToken('xoxb-secret-token');
    const parts = stored.split(':');
    const ct = Buffer.from(parts[4], 'base64');
    ct[0] ^= 1;
    parts[4] = ct.toString('base64');
    expect(() => decryptToken(parts.join(':'))).toThrow();
  });

  it('refuses unencrypted legacy values', () => {
    expect(() => decryptToken('xoxb-plain')).toThrow(/not encrypted/);
  });
});

describe('safeEqual', () => {
  it('compares strings of any length without throwing', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', 'x')).toBe(false);
  });
});
