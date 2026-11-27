import { hasOpinionBy, hasProfileBy, type SessionRow } from './data';
import { isJoined, keyFor } from './identity';

/** Where this browser is in the first-visit flow: join → profile → one "Love" post → wait. */
export type Onboarding = { joined: boolean; hasProfile: boolean; hasLove: boolean };

export async function getOnboarding(session: SessionRow): Promise<Onboarding> {
  const [joined, profileKey, opinionKey] = await Promise.all([
    isJoined(session.id, session.passphraseHash),
    keyFor('profile'),
    keyFor('opinion'),
  ]);
  const [hasProfile, hasLove] = await Promise.all([
    profileKey ? hasProfileBy(session.id, profileKey) : false,
    opinionKey ? hasOpinionBy(session.id, opinionKey, 'good') : false,
  ]);
  return { joined, hasProfile, hasLove };
}
