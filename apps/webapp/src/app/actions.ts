'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import * as core from '@/lib/core/participant';
import { CoreError } from '@/lib/core/errors';
import { passphraseHash, safeEqual } from '@/lib/crypto';
import { getSession, listGroups } from '@/lib/data';
import { ensureParticipantId, isJoined, setGroupId, setJoined, setLangCookie } from '@/lib/identity';
import { isLang } from '@/lib/i18n';
import { issueParticipantToken } from '@/lib/mcp-token';
import { getSigningKey } from '@/lib/secrets';

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

function refresh(sessionId: string) {
  revalidatePath(`/s/${sessionId}`, 'layout');
}

/** Returns the participant if this browser passed the session's current passphrase. */
async function requireJoined(sessionId: string): Promise<core.Participant> {
  const session = await getSession(sessionId);
  if (!session) throw new CoreError('session not found');
  if (!(await isJoined(sessionId, session.passphraseHash))) throw new CoreError('not joined');
  const pid = await ensureParticipantId();
  return { session, ...core.participantKeys(await getSigningKey(), pid) };
}

function toError(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(JSON.stringify({ msg: 'action failed', error: msg }));
  return fail(e instanceof CoreError ? msg : 'error');
}

async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
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

type OpinionInput = { sessionId: string } & z.infer<typeof core.opinionInput>;

export async function createOpinion({ sessionId, ...input }: OpinionInput): Promise<ActionResult> {
  return run(async () => core.createOpinion(await requireJoined(sessionId), input));
}

type OpinionUpdate = { sessionId: string } & z.infer<typeof core.opinionUpdateInput>;

export async function updateOpinion({ sessionId, ...input }: OpinionUpdate): Promise<ActionResult> {
  return run(async () => core.updateOpinion(await requireJoined(sessionId), input));
}

export async function deleteOpinion(sessionId: string, opinionId: string): Promise<ActionResult> {
  return run(async () => core.deleteOpinion(await requireJoined(sessionId), opinionId));
}

/** +1 is open to anyone viewing an open session (no passphrase) and never reaches an AI model. */
export async function toggleVote(sessionId: string, opinionId: string): Promise<ActionResult> {
  return run(async () => {
    const session = await getSession(sessionId);
    if (!session) throw new CoreError('session not found');
    const pid = await ensureParticipantId();
    await core.toggleVote(session, core.participantKeys(await getSigningKey(), pid).voterKey, opinionId);
  });
}

type ProfileInput = { sessionId: string } & z.infer<typeof core.profileInput>;

export async function saveProfile({ sessionId, ...input }: ProfileInput): Promise<ActionResult> {
  return run(async () => core.saveProfile(await requireJoined(sessionId), input));
}

export async function deleteProfile(sessionId: string): Promise<ActionResult> {
  return run(async () => core.deleteProfile(await requireJoined(sessionId)));
}

/** Personal MCP token: lets an AI client act as this browser in this session. */
export async function createMcpToken(
  sessionId: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const p = await requireJoined(sessionId);
    core.assertOpen(p.session);
    const pid = await ensureParticipantId();
    return { ok: true, token: issueParticipantToken(await getSigningKey(), p.session, pid) };
  } catch (e) {
    return toError(e) as { ok: false; error: string };
  }
}
