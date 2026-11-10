import { cookies, headers } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { getAdminPassword, getSigningKey } from './secrets';
import { joinToken, purposeKey, safeEqual, verifyAdminToken } from './crypto';
import { isLang, type Lang } from './i18n';

const PID = 'cl_pid';
const ADMIN = 'cl_admin';
const LANG = 'cl_lang';
const joinCookie = (sessionId: string) => `cl_join_${sessionId}`;

// Cookies outlive the event by a little; the whole stack is destroyed shortly after anyway.
const MAX_AGE = 60 * 60 * 24 * 30;
const baseCookie = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: MAX_AGE };

export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG)?.value;
  if (isLang(c)) return c;
  const al = (await headers()).get('accept-language') ?? '';
  return al.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export async function setLangCookie(lang: Lang) {
  (await cookies()).set(LANG, lang, { ...baseCookie, httpOnly: false });
}

/** Anonymous random id of this browser. Only readable server-side; never stored raw. */
export async function getParticipantId(): Promise<string | undefined> {
  return (await cookies()).get(PID)?.value;
}

/** Only callable from Server Actions / Route Handlers (cookies are read-only during render). */
export async function ensureParticipantId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(PID)?.value;
  if (existing) return existing;
  const pid = randomUUID();
  store.set(PID, pid, baseCookie);
  return pid;
}

export async function keyFor(purpose: 'opinion' | 'vote' | 'profile'): Promise<string | undefined> {
  const pid = await getParticipantId();
  if (!pid) return undefined;
  return purposeKey(await getSigningKey(), purpose, pid);
}

export async function isJoined(sessionId: string, currentPassphraseHash: string): Promise<boolean> {
  const token = (await cookies()).get(joinCookie(sessionId))?.value;
  if (!token) return false;
  return safeEqual(token, joinToken(await getSigningKey(), sessionId, currentPassphraseHash));
}

export async function setJoined(sessionId: string, currentPassphraseHash: string) {
  (await cookies()).set(
    joinCookie(sessionId),
    joinToken(await getSigningKey(), sessionId, currentPassphraseHash),
    baseCookie,
  );
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN)?.value;
  if (!token) return false;
  return verifyAdminToken(await getSigningKey(), await getAdminPassword(), token);
}

export async function setAdminCookie(token: string) {
  // Strict: the admin cookie is never sent on a request started from another site.
  (await cookies()).set(ADMIN, token, { ...baseCookie, sameSite: 'strict', maxAge: 60 * 60 * 12 });
}

export async function clearAdminCookie() {
  (await cookies()).delete(ADMIN);
}
