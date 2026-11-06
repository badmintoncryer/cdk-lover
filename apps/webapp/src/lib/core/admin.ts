/**
 * Organizer operations shared by the admin page and the MCP endpoint. Callers must check that the
 * caller is the admin (cookie or MCP admin token) before calling anything here.
 */
import { db } from '@repo/db/client';
import { groups, opinions, profiles, sessions, votes } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { summarize } from '@/lib/ai';
import { passphraseHash } from '@/lib/crypto';
import { getSession, listOpinions } from '@/lib/data';
import { notifySession } from '@/lib/events';
import { getSigningKey } from '@/lib/secrets';
import { coreError } from './errors';

/** Cost guard for the (larger) summary model. */
export const MAX_SUMMARIES_PER_SESSION = 20;

/** Refreshes the admin pages and, when given, the live boards of one session. */
async function refreshAdmin(sessionId?: string) {
  revalidatePath('/admin', 'layout');
  if (sessionId) {
    await notifySession(sessionId);
    revalidatePath(`/s/${sessionId}`, 'layout');
  }
}

export const sessionInput = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,32}$/, 'id must be lowercase letters, digits or -'),
  title: z.string().trim().min(1).max(120),
  /** Empty keeps the current passphrase when editing. */
  passphrase: z.string().max(200),
  status: z.enum(['open', 'closed']),
});

export async function upsertSession(input: z.infer<typeof sessionInput>): Promise<{ created: boolean }> {
  const parsed = sessionInput.safeParse(input);
  if (!parsed.success) throw coreError(parsed.error.issues[0]?.message ?? 'invalid');
  const { id, title, passphrase, status } = parsed.data;
  const existing = await getSession(id);
  const key = await getSigningKey();
  if (existing) {
    await db
      .update(sessions)
      .set({ title, status, ...(passphrase.trim() ? { passphraseHash: passphraseHash(key, id, passphrase) } : {}) })
      .where(eq(sessions.id, id));
  } else {
    if (!passphrase.trim()) throw coreError('passphrase is required');
    await db.insert(sessions).values({ id, title, status, passphraseHash: passphraseHash(key, id, passphrase) });
  }
  await refreshAdmin(id);
  return { created: !existing };
}

export const groupInput = z.object({ name: z.string().trim().min(1).max(40), language: z.enum(['ja', 'en']) });

export async function addGroup(sessionId: string, input: z.infer<typeof groupInput>): Promise<{ id: string }> {
  const parsed = groupInput.safeParse(input);
  if (!parsed.success) throw coreError('invalid');
  if (!(await getSession(sessionId))) throw coreError('session not found');
  const [row] = await db
    .insert(groups)
    .values({ sessionId, ...parsed.data })
    .returning({ id: groups.id });
  await refreshAdmin(sessionId);
  return { id: row!.id };
}

export async function deleteGroup(sessionId: string, groupId: string) {
  const used = await db.query.opinions.findFirst({ where: eq(opinions.groupId, groupId) });
  if (used) throw coreError('group has notes; delete them first');
  await db.delete(groups).where(and(eq(groups.id, groupId), eq(groups.sessionId, sessionId)));
  await refreshAdmin(sessionId);
}

export async function deleteAnyOpinion(sessionId: string, opinionId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(opinions).where(and(eq(opinions.id, opinionId), eq(opinions.sessionId, sessionId)));
    await tx.delete(votes).where(eq(votes.opinionId, opinionId));
  });
  await refreshAdmin(sessionId);
}

export async function deleteAnyProfile(sessionId: string, profileId: string) {
  await db.delete(profiles).where(and(eq(profiles.id, profileId), eq(profiles.sessionId, sessionId)));
  await refreshAdmin(sessionId);
}

export async function runSummary(sessionId: string): Promise<{ en: string; ja: string }> {
  const session = await getSession(sessionId);
  if (!session) throw coreError('session not found');
  if (session.summaryCount >= MAX_SUMMARIES_PER_SESSION) {
    throw coreError(`summary limit (${MAX_SUMMARIES_PER_SESSION}) reached`);
  }
  const items = await listOpinions(sessionId);
  if (items.length === 0) throw coreError('no notes yet');
  // Count before calling the model so failed calls still count against the cap.
  await db
    .update(sessions)
    .set({ summaryCount: session.summaryCount + 1 })
    .where(eq(sessions.id, sessionId));
  const { en, ja } = await summarize(
    items.map((o) => ({ category: o.category, group: o.groupName, text: o.bodyEn, votes: o.votes })),
  );
  await db
    .update(sessions)
    .set({ summaryEn: en, summaryJa: ja, summarizedAt: new Date() })
    .where(eq(sessions.id, sessionId));
  await refreshAdmin(sessionId);
  return { en, ja };
}

export async function clearSummary(sessionId: string) {
  await db
    .update(sessions)
    .set({ summaryEn: null, summaryJa: null, summarizedAt: null })
    .where(eq(sessions.id, sessionId));
  await refreshAdmin(sessionId);
}

/** Removes everything about one session. Children first: DSQL has no FK cascade. */
export async function deleteSessionData(sessionId: string, confirmId: string) {
  if (confirmId !== sessionId) throw coreError('type the session id to confirm');
  // Separate statements keep each transaction under DSQL's 3,000-row limit for this event's scale.
  await db.delete(votes).where(eq(votes.sessionId, sessionId));
  await db.delete(opinions).where(eq(opinions.sessionId, sessionId));
  await db.delete(profiles).where(eq(profiles.sessionId, sessionId));
  await db.delete(groups).where(eq(groups.sessionId, sessionId));
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  revalidatePath('/admin', 'layout');
}
