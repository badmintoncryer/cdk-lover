import { describe, expect, test } from 'vitest';
import { adminToken, joinToken, passphraseHash, purposeKey, verifyAdminToken } from './crypto';

describe('crypto helpers', () => {
  test('passphrase is normalized (case, width, spaces)', () => {
    expect(passphraseHash('k', '1130', '  CDK Love ')).toBe(passphraseHash('k', '1130', 'ｃｄｋ love'));
  });

  test('passphrase hash differs per session', () => {
    expect(passphraseHash('k', '1130', 'x')).not.toBe(passphraseHash('k', '1202', 'x'));
  });

  test('join token changes when the passphrase changes', () => {
    expect(joinToken('k', '1130', 'a')).not.toBe(joinToken('k', '1130', 'b'));
  });

  test('opinion and profile keys of the same browser are unlinkable', () => {
    expect(purposeKey('k', 'opinion', 'pid')).not.toBe(purposeKey('k', 'profile', 'pid'));
  });

  test('admin token verifies and expires', () => {
    const t = adminToken('k', 'pw', 2_000);
    expect(verifyAdminToken('k', 'pw', t, 1_000)).toBe(true);
    expect(verifyAdminToken('k', 'pw', t, 3_000)).toBe(false);
    expect(verifyAdminToken('k', 'other', t, 1_000)).toBe(false);
    expect(verifyAdminToken('k', 'pw', 'garbage', 1_000)).toBe(false);
  });
});
