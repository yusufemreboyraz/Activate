// Encrypts Slack bot tokens at rest (AES-256-GCM). Server-only.
//
// TOKEN_ENCRYPTION_KEY is 32 random bytes, base64-encoded:
//   openssl rand -base64 32
// Stored format: enc:v1:<iv b64>:<auth tag b64>:<ciphertext b64>
import crypto from 'node:crypto';

const PREFIX = 'enc:v1:';

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY is not set');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  return buf;
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    throw new Error('Stored token is not encrypted; reinstall the Slack app for this workspace');
  }
  const [ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split(':');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed encrypted token');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

// Constant-time string comparison that does not leak length via an exception.
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb) && a.length === b.length;
}
