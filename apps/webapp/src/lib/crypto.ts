import { createHmac, timingSafeEqual } from 'node:crypto';

export function hmac(key: string, message: string): string {
  return createHmac('sha256', key).update(message).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function normalizePassphrase(passphrase: string): string {
  return passphrase.normalize('NFKC').trim().toLowerCase();
}

export function passphraseHash(key: string, sessionId: string, passphrase: string): string {
  return hmac(key, `passphrase:${sessionId}:${normalizePassphrase(passphrase)}`);
}

/** Token proving the browser entered the current passphrase. Rotating the passphrase revokes it. */
export function joinToken(key: string, sessionId: string, currentPassphraseHash: string): string {
  return hmac(key, `join:${sessionId}:${currentPassphraseHash}`);
}

/**
 * Anonymous browser id → stored key. Each purpose uses a different salt so that an opinion's
 * author key cannot be matched against a profile's owner key.
 */
export function purposeKey(key: string, purpose: 'opinion' | 'vote' | 'profile', participantId: string): string {
  return hmac(key, `${purpose}:${participantId}`);
}

export function adminToken(key: string, adminPassword: string, expiresAt: number): string {
  return `${expiresAt}.${hmac(key, `admin:${adminPassword}:${expiresAt}`)}`;
}

export function verifyAdminToken(key: string, adminPassword: string, token: string, now = Date.now()): boolean {
  const [exp, sig] = token.split('.');
  const expiresAt = Number(exp);
  if (!sig || !Number.isFinite(expiresAt) || expiresAt < now) return false;
  return safeEqual(adminToken(key, adminPassword, expiresAt), `${exp}.${sig}`);
}
