/**
 * Attendee operations shared by the Server Actions (browser) and the MCP endpoint. Callers prove
 * who the participant is (passphrase cookie or MCP token) and pass the derived keys in; nothing
 * here reads cookies.
 */
import { db } from '@repo/db/client';
import { opinions, profiles, votes } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { translate, untranslated } from '@/lib/ai';
import { purposeKey } from '@/lib/crypto';
import { countOpinionsBy, countOpinionsInSession, listGroups, reserveTranslation, type SessionRow } from '@/lib/data';
import { notifySession } from '@/lib/events';
import { CATEGORIES } from '@/lib/i18n';
import { normalizeProfileUrl } from '@/lib/profile';
import { coreError } from './errors';

/**
 * Cost guards. The per-person cap is only a courtesy limit: a browser can drop its anonymous id
 * cookie to get a fresh one. The session-wide caps are the real bound on AI spend and DB rows.
 */
export const MAX_OPINIONS_PER_PERSON = 60;
const MAX_OPINIONS_PER_SESSION = Number(process.env.MAX_OPINIONS_PER_SESSION) || 1500;
/** Translation calls per session, posts and edits together (Nova Lite: roughly $0.0003 each). */
const MAX_TRANSLATIONS_PER_SESSION = Number(process.env.MAX_TRANSLATIONS_PER_SESSION) || 3000;
export const MAX_BODY = 400;

/** A participant of one session, identified by the per-purpose keys of their anonymous id. */
export type Participant = {
  session: SessionRow;
  authorKey: string;
  voterKey: string;
  ownerKey: string;
};

export function participantKeys(signingKey: string, participantId: string) {
  return {
    authorKey: purposeKey(signingKey, 'opinion', participantId),
    voterKey: purposeKey(signingKey, 'vote', participantId),
    ownerKey: purposeKey(signingKey, 'profile', participantId),
  };
}

export function assertOpen(session: SessionRow) {
  if (session.status !== 'open') throw coreError('closed');
}

/** Tells live boards to refetch and drops the server-rendered cache of the session pages. */
export async function refreshSession(sessionId: string) {
  await notifySession(sessionId);
  revalidatePath(`/s/${sessionId}`, 'layout');
}

/** Translates only while the session still has budget; otherwise the post is kept as written. */
async function translateWithinBudget(sessionId: string, body: string) {
  if (await reserveTranslation(sessionId, MAX_TRANSLATIONS_PER_SESSION)) return translate(body);
  console.warn(JSON.stringify({ msg: 'translation budget exhausted', sessionId }));
  return untranslated(body);
}

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw coreError('invalid');
  return parsed.data;
}

export const opinionInput = z.object({
  groupId: z.string().uuid(),
  category: z.enum(CATEGORIES),
  body: z.string().trim().min(1).max(MAX_BODY),
});

export async function createOpinion(p: Participant, input: z.infer<typeof opinionInput>): Promise<{ id: string }> {
  const { groupId, category, body } = parse(opinionInput, input);
  const sessionId = p.session.id;
  assertOpen(p.session);
  if (!(await listGroups(sessionId)).some((g) => g.id === groupId)) throw coreError('invalid');
  if ((await countOpinionsBy(sessionId, p.authorKey)) >= MAX_OPINIONS_PER_PERSON) throw coreError('limit');
  if ((await countOpinionsInSession(sessionId)) >= MAX_OPINIONS_PER_SESSION) throw coreError('limit');
  const tr = await translateWithinBudget(sessionId, body);
  const [row] = await db
    .insert(opinions)
    .values({
      sessionId,
      groupId,
      category,
      body,
      sourceLang: tr.sourceLang,
      bodyEn: tr.en,
      bodyJa: tr.ja,
      authorKey: p.authorKey,
    })
    .returning({ id: opinions.id });
  await refreshSession(sessionId);
  return { id: row!.id };
}

export const opinionUpdateInput = z.object({
  opinionId: z.string().uuid(),
  category: z.enum(CATEGORIES),
  body: z.string().trim().min(1).max(MAX_BODY),
});

export async function updateOpinion(p: Participant, input: z.infer<typeof opinionUpdateInput>) {
  const { opinionId, category, body } = parse(opinionUpdateInput, input);
  const sessionId = p.session.id;
  assertOpen(p.session);
  const where = and(eq(opinions.id, opinionId), eq(opinions.sessionId, sessionId), eq(opinions.authorKey, p.authorKey));
  const existing = await db.query.opinions.findFirst({ where });
  if (!existing) throw coreError('not found');
  const tr =
    existing.body === body
      ? { sourceLang: existing.sourceLang, en: existing.bodyEn, ja: existing.bodyJa }
      : await translateWithinBudget(sessionId, body);
  await db
    .update(opinions)
    .set({ category, body, sourceLang: tr.sourceLang, bodyEn: tr.en, bodyJa: tr.ja })
    .where(where);
  await refreshSession(sessionId);
}

/** Allowed after the session closed, so people can still take their posts back. */
export async function deleteOpinion(p: Participant, opinionId: string) {
  parse(z.string().uuid(), opinionId);
  const sessionId = p.session.id;
  await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(opinions)
      .where(and(eq(opinions.id, opinionId), eq(opinions.sessionId, sessionId), eq(opinions.authorKey, p.authorKey)))
      .returning({ id: opinions.id });
    if (deleted.length === 0) throw coreError('not found');
    await tx.delete(votes).where(eq(votes.opinionId, opinionId));
  });
  await refreshSession(sessionId);
}

/**
 * +1 does not need the passphrase so people can react from the first minute, before they join.
 * It calls no AI model and the (opinion, voter) primary key caps it at one vote per browser.
 */
export async function toggleVote(
  session: SessionRow,
  voterKey: string,
  opinionId: string,
): Promise<{ voted: boolean }> {
  parse(z.string().uuid(), opinionId);
  assertOpen(session);
  const target = await db.query.opinions.findFirst({
    where: and(eq(opinions.id, opinionId), eq(opinions.sessionId, session.id)),
  });
  if (!target) throw coreError('not found');
  const where = and(eq(votes.opinionId, opinionId), eq(votes.voterKey, voterKey));
  const existing = await db.query.votes.findFirst({ where });
  if (existing) {
    await db.delete(votes).where(where);
  } else {
    await db.insert(votes).values({ opinionId, voterKey, sessionId: session.id }).onConflictDoNothing();
  }
  await refreshSession(session.id);
  return { voted: !existing };
}

export const profileInput = z.object({
  name: z.string().trim().min(1).max(60),
  intro: z.string().trim().max(160),
  linkedin: z.string().max(300),
  x: z.string().max(300),
  github: z.string().max(300),
});

export async function saveProfile(p: Participant, input: z.infer<typeof profileInput>) {
  const { name, intro, linkedin, x, github } = parse(profileInput, input);
  let urls: { linkedinUrl: string | null; xUrl: string | null; githubUrl: string | null };
  try {
    urls = {
      linkedinUrl: normalizeProfileUrl('linkedin', linkedin),
      xUrl: normalizeProfileUrl('x', x),
      githubUrl: normalizeProfileUrl('github', github),
    };
  } catch {
    throw coreError('invalid url');
  }
  const sessionId = p.session.id;
  assertOpen(p.session);
  const where = and(eq(profiles.sessionId, sessionId), eq(profiles.ownerKey, p.ownerKey));
  const existing = await db.query.profiles.findFirst({ where });
  if (existing) {
    await db
      .update(profiles)
      .set({ name, intro, ...urls })
      .where(where);
  } else {
    await db.insert(profiles).values({ sessionId, name, intro, ownerKey: p.ownerKey, ...urls });
  }
  await refreshSession(sessionId);
}

/** Allowed after the session closed. */
export async function deleteProfile(p: Participant) {
  const sessionId = p.session.id;
  await db.delete(profiles).where(and(eq(profiles.sessionId, sessionId), eq(profiles.ownerKey, p.ownerKey)));
  await refreshSession(sessionId);
}
