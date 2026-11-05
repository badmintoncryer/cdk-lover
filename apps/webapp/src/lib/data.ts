import { db } from '@repo/db/client';
import { groups, opinions, profiles, sessions, votes } from '@repo/db/schema';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';

export type SessionRow = typeof sessions.$inferSelect;
export type GroupRow = typeof groups.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;

/** What the browser receives: author keys are replaced by an `mine` flag. */
export type OpinionView = {
  id: string;
  groupId: string;
  groupName: string;
  category: string;
  body: string;
  sourceLang: string;
  bodyEn: string;
  bodyJa: string;
  votes: number;
  votedByMe: boolean;
  mine: boolean;
  createdAt: string;
};

export type ProfileView = Omit<ProfileRow, 'ownerKey' | 'createdAt' | 'updatedAt'> & { mine: boolean };

export async function listSessions(): Promise<SessionRow[]> {
  return db.select().from(sessions).orderBy(asc(sessions.id));
}

export async function getSession(id: string): Promise<SessionRow | undefined> {
  return db.query.sessions.findFirst({ where: eq(sessions.id, id) });
}

export async function listGroups(sessionId: string): Promise<GroupRow[]> {
  return db.select().from(groups).where(eq(groups.sessionId, sessionId)).orderBy(asc(groups.createdAt));
}

export async function listOpinions(
  sessionId: string,
  opts: { authorKey?: string; voterKey?: string } = {},
): Promise<OpinionView[]> {
  const [rows, groupRows, voteCounts, myVotes] = await Promise.all([
    db.select().from(opinions).where(eq(opinions.sessionId, sessionId)).orderBy(desc(opinions.createdAt)),
    listGroups(sessionId),
    db
      .select({ opinionId: votes.opinionId, n: count() })
      .from(votes)
      .where(eq(votes.sessionId, sessionId))
      .groupBy(votes.opinionId),
    opts.voterKey
      ? db
          .select({ opinionId: votes.opinionId })
          .from(votes)
          .where(and(eq(votes.sessionId, sessionId), eq(votes.voterKey, opts.voterKey)))
      : Promise.resolve([]),
  ]);
  const groupName = new Map(groupRows.map((g) => [g.id, g.name]));
  const voteMap = new Map(voteCounts.map((v) => [v.opinionId, Number(v.n)]));
  const mineVoted = new Set(myVotes.map((v) => v.opinionId));
  return rows.map((o) => ({
    id: o.id,
    groupId: o.groupId,
    groupName: groupName.get(o.groupId) ?? '-',
    category: o.category,
    body: o.body,
    sourceLang: o.sourceLang,
    bodyEn: o.bodyEn,
    bodyJa: o.bodyJa,
    votes: voteMap.get(o.id) ?? 0,
    votedByMe: mineVoted.has(o.id),
    mine: !!opts.authorKey && o.authorKey === opts.authorKey,
    createdAt: o.createdAt.toISOString(),
  }));
}

export async function countOpinionsBy(sessionId: string, authorKey: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(opinions)
    .where(and(eq(opinions.sessionId, sessionId), eq(opinions.authorKey, authorKey)));
  return Number(r?.n ?? 0);
}

export async function listProfiles(sessionId: string, ownerKey?: string): Promise<ProfileView[]> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.sessionId, sessionId))
    .orderBy(asc(profiles.createdAt));
  return rows.map(({ ownerKey: k, createdAt: _c, updatedAt: _u, ...p }) => ({
    ...p,
    mine: !!ownerKey && k === ownerKey,
  }));
}

export async function countOpinionsInSession(sessionId: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(opinions).where(eq(opinions.sessionId, sessionId));
  return Number(r?.n ?? 0);
}

/** DSQL reports optimistic-concurrency conflicts as SQLSTATE 40001; drizzle may wrap the pg error. */
function isConflict(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | undefined;
  return err?.code === '40001' || err?.cause?.code === '40001';
}

/**
 * Atomically takes one translation from the session's budget. Returns false once `max` calls were
 * spent, so the caller saves the post untranslated instead of calling the model. The counter only
 * grows: deleting a note does not give the call back.
 */
export async function reserveTranslation(sessionId: string, max: number): Promise<boolean> {
  const used = sql`coalesce(${sessions.translateCount}, 0)`;
  for (let attempt = 0; ; attempt++) {
    try {
      const rows = await db
        .update(sessions)
        .set({ translateCount: sql`${used} + 1` })
        .where(and(eq(sessions.id, sessionId), sql`${used} < ${max}`))
        .returning({ id: sessions.id });
      return rows.length > 0;
    } catch (e) {
      // Concurrent posts update the same Session row; retry a few times with jitter.
      if (!isConflict(e) || attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 80 * (attempt + 1)));
    }
  }
}
