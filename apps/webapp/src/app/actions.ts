'use server';

import { db } from '@repo/db/client';
import { opinions, profiles, votes } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { translate, untranslated } from '@/lib/ai';
import { passphraseHash, purposeKey, safeEqual } from '@/lib/crypto';
import { countOpinionsBy, countOpinionsInSession, getSession, listGroups, reserveTranslation } from '@/lib/data';
import { notifySession } from '@/lib/events';
import { CATEGORIES, isLang } from '@/lib/i18n';
import { ensureParticipantId, isJoined, setGroupId, setJoined, setLangCookie } from '@/lib/identity';
import { normalizeProfileUrl } from '@/lib/profile';
import { getSigningKey } from '@/lib/secrets';

/**
 * Cost guards. The per-person cap is only a courtesy limit: a browser can drop its anonymous id
 * cookie to get a fresh one. The session-wide caps are the real bound on AI spend and DB rows.
 */
const MAX_OPINIONS_PER_PERSON = 60;
const MAX_OPINIONS_PER_SESSION = Number(process.env.MAX_OPINIONS_PER_SESSION) || 1500;
/** Translation calls per session, posts and edits together (Nova Lite: roughly $0.0003 each). */
const MAX_TRANSLATIONS_PER_SESSION = Number(process.env.MAX_TRANSLATIONS_PER_SESSION) || 3000;
const MAX_BODY = 400;

/** Translates only while the session still has budget; otherwise the post is kept as written. */
async function translateWithinBudget(sessionId: string, body: string) {
  if (await reserveTranslation(sessionId, MAX_TRANSLATIONS_PER_SESSION)) return translate(body);
  console.warn(JSON.stringify({ msg: 'translation budget exhausted', sessionId }));
  return untranslated(body);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

function refresh(sessionId: string) {
  revalidatePath(`/s/${sessionId}`, 'layout');
}

/** Returns the session if this browser passed its passphrase and it is open for posts. */
async function requireJoined(sessionId: string, opts: { allowClosed?: boolean } = {}) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('session not found');
  if (!(await isJoined(sessionId, session.passphraseHash))) throw new Error('not joined');
  if (session.status !== 'open' && !opts.allowClosed) throw new Error('closed');
  const pid = await ensureParticipantId();
  const key = await getSigningKey();
  return {
    session,
    authorKey: purposeKey(key, 'opinion', pid),
    voterKey: purposeKey(key, 'vote', pid),
    ownerKey: purposeKey(key, 'profile', pid),
  };
}

function toError(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(JSON.stringify({ msg: 'action failed', error: msg }));
  return fail(['not joined', 'closed', 'session not found', 'limit', 'not found'].includes(msg) ? msg : 'error');
}

export async function setLang(lang: string) {
  if (isLang(lang)) await setLangCookie(lang);
}

const joinSchema = z.object({
  sessionId: z.string().min(1).max(32),
  passphrase: z.string().min(1).max(200),
  groupId: z.string().uuid(),
});

export async function joinSession(input: z.infer<typeof joinSchema>): Promise<ActionResult> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const { sessionId, passphrase, groupId } = parsed.data;
  const session = await getSession(sessionId);
  if (!session) return fail('session not found');
  const expected = passphraseHash(await getSigningKey(), sessionId, passphrase);
  if (!safeEqual(expected, session.passphraseHash)) return fail('wrong passphrase');
  const groupRows = await listGroups(sessionId);
  if (!groupRows.some((g) => g.id === groupId)) return fail('invalid');
  await ensureParticipantId();
  await setJoined(sessionId, session.passphraseHash);
  await setGroupId(sessionId, groupId);
  refresh(sessionId);
  return { ok: true };
}

export async function changeGroup(sessionId: string, groupId: string): Promise<ActionResult> {
  const groupRows = await listGroups(sessionId);
  if (!groupRows.some((g) => g.id === groupId)) return fail('invalid');
  await setGroupId(sessionId, groupId);
  refresh(sessionId);
  return { ok: true };
}

const opinionSchema = z.object({
  sessionId: z.string().min(1).max(32),
  groupId: z.string().uuid(),
  category: z.enum(CATEGORIES),
  body: z.string().trim().min(1).max(MAX_BODY),
});

export async function createOpinion(input: z.infer<typeof opinionSchema>): Promise<ActionResult> {
  const parsed = opinionSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  try {
    const { sessionId, groupId, category, body } = parsed.data;
    const { authorKey } = await requireJoined(sessionId);
    if (!(await listGroups(sessionId)).some((g) => g.id === groupId)) return fail('invalid');
    if ((await countOpinionsBy(sessionId, authorKey)) >= MAX_OPINIONS_PER_PERSON) throw new Error('limit');
    if ((await countOpinionsInSession(sessionId)) >= MAX_OPINIONS_PER_SESSION) throw new Error('limit');
    const tr = await translateWithinBudget(sessionId, body);
    await db.insert(opinions).values({
      sessionId,
      groupId,
      category,
      body,
      sourceLang: tr.sourceLang,
      bodyEn: tr.en,
      bodyJa: tr.ja,
      authorKey,
    });
    await notifySession(sessionId);
    refresh(sessionId);
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

const updateSchema = z.object({
  sessionId: z.string().min(1).max(32),
  opinionId: z.string().uuid(),
  category: z.enum(CATEGORIES),
  body: z.string().trim().min(1).max(MAX_BODY),
});

export async function updateOpinion(input: z.infer<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  try {
    const { sessionId, opinionId, category, body } = parsed.data;
    const { authorKey } = await requireJoined(sessionId);
    const where = and(eq(opinions.id, opinionId), eq(opinions.sessionId, sessionId), eq(opinions.authorKey, authorKey));
    const existing = await db.query.opinions.findFirst({ where });
    if (!existing) throw new Error('not found');
    const tr =
      existing.body === body
        ? { sourceLang: existing.sourceLang, en: existing.bodyEn, ja: existing.bodyJa }
        : await translateWithinBudget(sessionId, body);
    await db
      .update(opinions)
      .set({ category, body, sourceLang: tr.sourceLang, bodyEn: tr.en, bodyJa: tr.ja })
      .where(where);
    await notifySession(sessionId);
    refresh(sessionId);
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteOpinion(sessionId: string, opinionId: string): Promise<ActionResult> {
  try {
    const { authorKey } = await requireJoined(sessionId, { allowClosed: true });
    await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(opinions)
        .where(and(eq(opinions.id, opinionId), eq(opinions.sessionId, sessionId), eq(opinions.authorKey, authorKey)))
        .returning({ id: opinions.id });
      if (deleted.length === 0) throw new Error('not found');
      await tx.delete(votes).where(eq(votes.opinionId, opinionId));
    });
    await notifySession(sessionId);
    refresh(sessionId);
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

/**
 * +1 does not need the passphrase so people can react from the first minute, before they join.
 * It calls no AI model and the (opinion, voter) primary key caps it at one vote per browser.
 */
async function requireVoter(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('session not found');
  if (session.status !== 'open') throw new Error('closed');
  const pid = await ensureParticipantId();
  return purposeKey(await getSigningKey(), 'vote', pid);
}

export async function toggleVote(sessionId: string, opinionId: string): Promise<ActionResult> {
  try {
    const voterKey = await requireVoter(sessionId);
    const target = await db.query.opinions.findFirst({
      where: and(eq(opinions.id, opinionId), eq(opinions.sessionId, sessionId)),
    });
    if (!target) throw new Error('not found');
    const where = and(eq(votes.opinionId, opinionId), eq(votes.voterKey, voterKey));
    const existing = await db.query.votes.findFirst({ where });
    if (existing) {
      await db.delete(votes).where(where);
    } else {
      await db.insert(votes).values({ opinionId, voterKey, sessionId }).onConflictDoNothing();
    }
    await notifySession(sessionId);
    refresh(sessionId);
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

const profileSchema = z.object({
  sessionId: z.string().min(1).max(32),
  name: z.string().trim().min(1).max(60),
  intro: z.string().trim().max(160),
  linkedin: z.string().max(300),
  x: z.string().max(300),
  github: z.string().max(300),
});

export async function saveProfile(input: z.infer<typeof profileSchema>): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  let urls: { linkedinUrl: string | null; xUrl: string | null; githubUrl: string | null };
  try {
    urls = {
      linkedinUrl: normalizeProfileUrl('linkedin', parsed.data.linkedin),
      xUrl: normalizeProfileUrl('x', parsed.data.x),
      githubUrl: normalizeProfileUrl('github', parsed.data.github),
    };
  } catch {
    return fail('invalid url');
  }
  try {
    const { sessionId, name, intro } = parsed.data;
    const { ownerKey } = await requireJoined(sessionId);
    const where = and(eq(profiles.sessionId, sessionId), eq(profiles.ownerKey, ownerKey));
    const existing = await db.query.profiles.findFirst({ where });
    if (existing) {
      await db
        .update(profiles)
        .set({ name, intro, ...urls })
        .where(where);
    } else {
      await db.insert(profiles).values({ sessionId, name, intro, ownerKey, ...urls });
    }
    await notifySession(sessionId);
    refresh(sessionId);
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteProfile(sessionId: string): Promise<ActionResult> {
  try {
    const { ownerKey } = await requireJoined(sessionId, { allowClosed: true });
    await db.delete(profiles).where(and(eq(profiles.sessionId, sessionId), eq(profiles.ownerKey, ownerKey)));
    await notifySession(sessionId);
    refresh(sessionId);
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}
