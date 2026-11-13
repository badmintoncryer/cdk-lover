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
import { isPhase, PHASE_INFO, type Phase } from '@/lib/phases';
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

/**
 * Switches the meetup to a phase (or clears the banner with null). The banner counts down from
 * now for `minutes` (the phase's default when omitted; 0 shows no countdown).
 */
export async function setPhase(sessionId: string, phase: Phase | null, minutes?: number) {
  if (phase !== null && !isPhase(phase)) throw coreError('unknown phase');
  const session = await getSession(sessionId);
  if (!session) throw coreError('session not found');
  const mins = phase === null ? 0 : Math.max(0, Math.min(120, minutes ?? PHASE_INFO[phase].minutes));
  await db
    .update(sessions)
    .set({ phase, phaseEndsAt: mins > 0 ? new Date(Date.now() + mins * 60_000) : null })
    .where(eq(sessions.id, sessionId));
  await refreshAdmin(sessionId);
}

/** Moves the current phase's end time by `minutes` (negative shortens). */
export async function extendPhase(sessionId: string, minutes: number) {
  const session = await getSession(sessionId);
  if (!session) throw coreError('session not found');
  if (!session.phase) throw coreError('no phase is on');
  const base = Math.max(session.phaseEndsAt?.getTime() ?? 0, Date.now());
  await db
    .update(sessions)
    .set({ phaseEndsAt: new Date(base + minutes * 60_000) })
    .where(eq(sessions.id, sessionId));
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
  const { en, ja } = await summarize(items.map((o) => ({ category: o.category, text: o.bodyEn, votes: o.votes })));
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
