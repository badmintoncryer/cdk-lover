/**
 * Bearer tokens for the MCP endpoint. Nothing is stored: a participant token is signed with the
 * app's signing key, and the admin token is a random secret only the AWS account can read.
 *
 * Participant token: `p1.<sessionId>.<participantId>.<expiresAt>.<sig>`. It carries the same
 * anonymous browser id as the `cl_pid` cookie, so posts made over MCP and in the browser belong
 * to the same person. The signature covers the session's current passphrase hash, so rotating the
 * passphrase revokes every token of that session, like the join cookie.
 */
import { hmac, safeEqual } from './crypto';

export const PARTICIPANT_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const PREFIX = 'p1';

export type ParticipantClaims = { sessionId: string; participantId: string; expiresAt: number };

function sign(key: string, c: ParticipantClaims, currentPassphraseHash: string): string {
  return hmac(key, `mcp:${c.sessionId}:${c.participantId}:${c.expiresAt}:${currentPassphraseHash}`);
}

export function issueParticipantToken(
  key: string,
  session: { id: string; passphraseHash: string },
  participantId: string,
  now = Date.now(),
): string {
  const claims = { sessionId: session.id, participantId, expiresAt: now + PARTICIPANT_TOKEN_TTL_MS };
  const sig = sign(key, claims, session.passphraseHash);
  return [PREFIX, claims.sessionId, claims.participantId, claims.expiresAt, sig].join('.');
}

/** Reads the claims without checking the signature; call `verifyParticipantToken` before trusting them. */
export function parseParticipantToken(token: string): ParticipantClaims | undefined {
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== PREFIX) return undefined;
  const [, sessionId, participantId, exp] = parts as [string, string, string, string, string];
  const expiresAt = Number(exp);
  if (!/^[a-z0-9-]{1,32}$/.test(sessionId) || !/^[0-9a-f-]{36}$/.test(participantId)) return undefined;
  if (!/^\d{1,16}$/.test(exp) || !Number.isFinite(expiresAt)) return undefined;
  return { sessionId, participantId, expiresAt };
}

export function verifyParticipantToken(
  key: string,
  token: string,
  currentPassphraseHash: string,
  now = Date.now(),
): ParticipantClaims | undefined {
  const claims = parseParticipantToken(token);
  if (!claims || claims.expiresAt < now) return undefined;
  const sig = token.slice(token.lastIndexOf('.') + 1);
  return safeEqual(sig, sign(key, claims, currentPassphraseHash)) ? claims : undefined;
}

/** Constant-time comparison against the admin secret. A short or empty secret never matches. */
export function isAdminToken(token: string, adminSecret: string): boolean {
  return adminSecret.length >= 32 && safeEqual(token, adminSecret);
}

/** Bearer header first, then the last path segment (`/api/mcp/<token>`) for clients without headers. */
export function tokenFromRequest(req: Request, pathToken?: string): string | undefined {
  const auth = req.headers.get('authorization');
  const m = auth?.match(/^Bearer\s+(\S+)$/i);
  return m?.[1] ?? (pathToken || undefined);
}
