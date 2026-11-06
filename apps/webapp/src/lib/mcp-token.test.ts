import { describe, expect, it } from 'vitest';
import {
  PARTICIPANT_TOKEN_TTL_MS,
  isAdminToken,
  issueParticipantToken,
  parseParticipantToken,
  tokenFromRequest,
  verifyParticipantToken,
} from './mcp-token';

const key = 'test-signing-key';
const session = { id: '1130', passphraseHash: 'hash-a' };
const pid = '6f1c1c3e-2b8a-4c55-9d1e-0b4a1f2e3d4c';
const now = 1_700_000_000_000;

describe('participant token', () => {
  it('round-trips its claims', () => {
    const token = issueParticipantToken(key, session, pid, now);
    expect(verifyParticipantToken(key, token, 'hash-a', now + 1000)).toEqual({
      sessionId: '1130',
      participantId: pid,
      expiresAt: now + PARTICIPANT_TOKEN_TTL_MS,
    });
  });

  it('is revoked by a passphrase change', () => {
    const token = issueParticipantToken(key, session, pid, now);
    expect(verifyParticipantToken(key, token, 'hash-b', now)).toBeUndefined();
  });

  it('expires', () => {
    const token = issueParticipantToken(key, session, pid, now);
    expect(verifyParticipantToken(key, token, 'hash-a', now + PARTICIPANT_TOKEN_TTL_MS + 1)).toBeUndefined();
  });

  it('rejects a token signed with another key', () => {
    const token = issueParticipantToken('other-key', session, pid, now);
    expect(verifyParticipantToken(key, token, 'hash-a', now)).toBeUndefined();
  });

  it('rejects edited claims', () => {
    const token = issueParticipantToken(key, session, pid, now);
    const otherSession = token.replace('.1130.', '.1202.');
    expect(verifyParticipantToken(key, otherSession, 'hash-a', now)).toBeUndefined();
    const longer = token.replace(`.${now + PARTICIPANT_TOKEN_TTL_MS}.`, `.${now + 2 * PARTICIPANT_TOKEN_TTL_MS}.`);
    expect(verifyParticipantToken(key, longer, 'hash-a', now)).toBeUndefined();
  });

  it('parses only well-formed tokens', () => {
    expect(parseParticipantToken('garbage')).toBeUndefined();
    expect(parseParticipantToken(`p1.UPPER.${pid}.1.sig`)).toBeUndefined();
    expect(parseParticipantToken(`p1.1130.not-a-uuid.1.sig`)).toBeUndefined();
    expect(parseParticipantToken(`p1.1130.${pid}.1.sig`)?.sessionId).toBe('1130');
  });
});

describe('admin token', () => {
  const secret = 'a'.repeat(48);
  it('matches only the exact secret', () => {
    expect(isAdminToken(secret, secret)).toBe(true);
    expect(isAdminToken('a'.repeat(47), secret)).toBe(false);
  });
  it('never matches a short or empty secret', () => {
    expect(isAdminToken('', '')).toBe(false);
    expect(isAdminToken('short', 'short')).toBe(false);
  });
});

describe('tokenFromRequest', () => {
  it('prefers the bearer header', () => {
    const req = new Request('https://x/api/mcp/path-token', { headers: { authorization: 'Bearer header-token' } });
    expect(tokenFromRequest(req, 'path-token')).toBe('header-token');
  });
  it('falls back to the path', () => {
    expect(tokenFromRequest(new Request('https://x/api/mcp/t'), 't')).toBe('t');
    expect(tokenFromRequest(new Request('https://x/api/mcp'))).toBeUndefined();
  });
});
