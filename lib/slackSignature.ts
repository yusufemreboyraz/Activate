// Verifies Slack's request signature (https://api.slack.com/authentication/verifying-requests-from-slack).
import crypto from 'node:crypto';
import { safeEqual } from '@/lib/tokenCrypto';

const MAX_SKEW_SECONDS = 60 * 5;

export function verifySlackSignature(params: {
  signingSecret: string;
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
  nowSeconds?: number;
}): boolean {
  const { signingSecret, signature, timestamp, rawBody } = params;
  if (!signature || !timestamp || !/^\d+$/.test(timestamp)) return false;

  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > MAX_SKEW_SECONDS) return false;

  const expected =
    'v0=' + crypto.createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`, 'utf8').digest('hex');
  return safeEqual(expected, signature);
}
