'use server';

import { db } from '@repo/db/client';
import { groups, opinions, profiles, sessions, votes } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { summarize } from '@/lib/ai';
import { adminToken, passphraseHash, safeEqual } from '@/lib/crypto';
import { getSession, listOpinions } from '@/lib/data';
import { notifySession } from '@/lib/events';
import { clearAdminCookie, isAdmin, setAdminCookie } from '@/lib/identity';
import { getAdminPassword, getSigningKey } from '@/lib/secrets';

/** Cost guard for the (larger) summary model. */
const MAX_SUMMARIES_PER_SESSION = 20;

export type AdminResult = { ok: true; message?: string } | { ok: false; error: string };

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('unauthorized');
}

function done(sessionId?: string): AdminResult {
  revalidatePath('/admin', 'layout');
  if (sessionId) revalidatePath(`/s/${sessionId}`, 'layout');
  return { ok: true };
}

function toError(e: unknown): AdminResult {
  const error = e instanceof Error ? e.message : String(e);
  console.error(JSON.stringify({ msg: 'admin action failed', error }));
  return { ok: false, error };
}

export async function adminLogin(password: string): Promise<AdminResult> {
  const expected = await getAdminPassword();
  if (!safeEqual(password.trim(), expected)) return { ok: false, error: 'wrong password' };
  await setAdminCookie(adminToken(await getSigningKey(), expected, Date.now() + 12 * 60 * 60 * 1000));
  return done();
}

export async function adminLogout() {
  await clearAdminCookie();
  redirect('/admin');
}

const sessionSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,32}$/, 'id must be lowercase letters, digits or -'),
  title: z.string().trim().min(1).max(120),
  /** Empty keeps the current passphrase when editing. */
  passphrase: z.string().max(200),
  status: z.enum(['open', 'closed']),
});

export async function upsertSession(input: z.infer<typeof sessionSchema>): Promise<AdminResult> {
  try {
    await requireAdmin();
    const parsed = sessionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
    const { id, title, passphrase, status } = parsed.data;
    const existing = await getSession(id);
    const key = await getSigningKey();
    if (existing) {
      await db
        .update(sessions)
        .set({ title, status, ...(passphrase.trim() ? { passphraseHash: passphraseHash(key, id, passphrase) } : {}) })
        .where(eq(sessions.id, id));
    } else {
      if (!passphrase.trim()) return { ok: false, error: 'passphrase is required' };
      await db.insert(sessions).values({ id, title, status, passphraseHash: passphraseHash(key, id, passphrase) });
    }
    await notifySession(id);
    return done(id);
  } catch (e) {
    return toError(e);
  }
}

export async function addGroup(sessionId: string, name: string, language: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    const parsed = z
      .object({ name: z.string().trim().min(1).max(40), language: z.enum(['ja', 'en']) })
      .safeParse({ name, language });
    if (!parsed.success) return { ok: false, error: 'invalid' };
    await db.insert(groups).values({ sessionId, ...parsed.data });
    await notifySession(sessionId);
    return done(sessionId);
  } catch (e) {
    return toError(e);
  }
}

export async function deleteGroup(sessionId: string, groupId: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    const used = await db.query.opinions.findFirst({ where: eq(opinions.groupId, groupId) });
    if (used) return { ok: false, error: 'group has notes; delete them first' };
    await db.delete(groups).where(and(eq(groups.id, groupId), eq(groups.sessionId, sessionId)));
    return done(sessionId);
  } catch (e) {
    return toError(e);
  }
}

export async function adminDeleteOpinion(sessionId: string, opinionId: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    await db.transaction(async (tx) => {
      await tx.delete(opinions).where(and(eq(opinions.id, opinionId), eq(opinions.sessionId, sessionId)));
      await tx.delete(votes).where(eq(votes.opinionId, opinionId));
    });
    await notifySession(sessionId);
    return done(sessionId);
  } catch (e) {
    return toError(e);
  }
}

export async function adminDeleteProfile(sessionId: string, profileId: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    await db.delete(profiles).where(and(eq(profiles.id, profileId), eq(profiles.sessionId, sessionId)));
    await notifySession(sessionId);
    return done(sessionId);
  } catch (e) {
    return toError(e);
  }
}

export async function runSummary(sessionId: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    const session = await getSession(sessionId);
    if (!session) return { ok: false, error: 'session not found' };
    if (session.summaryCount >= MAX_SUMMARIES_PER_SESSION) {
      return { ok: false, error: `summary limit (${MAX_SUMMARIES_PER_SESSION}) reached` };
    }
    const items = await listOpinions(sessionId);
    if (items.length === 0) return { ok: false, error: 'no notes yet' };
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
    await notifySession(sessionId);
    return done(sessionId);
  } catch (e) {
    return toError(e);
  }
}

export async function clearSummary(sessionId: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    await db
      .update(sessions)
      .set({ summaryEn: null, summaryJa: null, summarizedAt: null })
      .where(eq(sessions.id, sessionId));
    await notifySession(sessionId);
    return done(sessionId);
  } catch (e) {
    return toError(e);
  }
}

/** Removes everything about one session. Children first: DSQL has no FK cascade. */
export async function deleteSessionData(sessionId: string, confirmId: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    if (confirmId !== sessionId) return { ok: false, error: 'type the session id to confirm' };
    // Separate statements keep each transaction under DSQL's 3,000-row limit for this event's scale.
    await db.delete(votes).where(eq(votes.sessionId, sessionId));
    await db.delete(opinions).where(eq(opinions.sessionId, sessionId));
    await db.delete(profiles).where(eq(profiles.sessionId, sessionId));
    await db.delete(groups).where(eq(groups.sessionId, sessionId));
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    revalidatePath('/admin', 'layout');
  } catch (e) {
    return toError(e);
  }
  redirect('/admin');
}
