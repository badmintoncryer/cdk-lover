'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as core from '@/lib/core/admin';
import { adminToken, safeEqual } from '@/lib/crypto';
import { clearAdminCookie, isAdmin, setAdminCookie } from '@/lib/identity';
import type { Phase } from '@/lib/phases';
import { getAdminPassword, getSigningKey } from '@/lib/secrets';

export type AdminResult = { ok: true; message?: string } | { ok: false; error: string };

function toError(e: unknown): AdminResult {
  const error = e instanceof Error ? e.message : String(e);
  console.error(JSON.stringify({ msg: 'admin action failed', error }));
  return { ok: false, error };
}

/** Admin pages only: every mutation checks the admin cookie before touching anything. */
async function asAdmin(fn: () => Promise<unknown>): Promise<AdminResult> {
  try {
    if (!(await isAdmin())) throw new Error('unauthorized');
    await fn();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function adminLogin(password: string): Promise<AdminResult> {
  const expected = await getAdminPassword();
  if (!safeEqual(password.trim(), expected)) return { ok: false, error: 'wrong password' };
  await setAdminCookie(adminToken(await getSigningKey(), expected, Date.now() + 12 * 60 * 60 * 1000));
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function adminLogout() {
  await clearAdminCookie();
  redirect('/admin');
}

export async function upsertSession(input: z.infer<typeof core.sessionInput>): Promise<AdminResult> {
  return asAdmin(() => core.upsertSession(input));
}

export async function setPhase(sessionId: string, phase: Phase | null): Promise<AdminResult> {
  return asAdmin(() => core.setPhase(sessionId, phase));
}

export async function stepPhase(sessionId: string, step: 1 | -1): Promise<AdminResult> {
  return asAdmin(() => core.stepPhase(sessionId, step));
}

export async function adminDeleteOpinion(sessionId: string, opinionId: string): Promise<AdminResult> {
  return asAdmin(() => core.deleteAnyOpinion(sessionId, opinionId));
}

export async function adminDeleteProfile(sessionId: string, profileId: string): Promise<AdminResult> {
  return asAdmin(() => core.deleteAnyProfile(sessionId, profileId));
}

export async function runSummary(sessionId: string): Promise<AdminResult> {
  return asAdmin(() => core.runSummary(sessionId));
}

export async function clearSummary(sessionId: string): Promise<AdminResult> {
  return asAdmin(() => core.clearSummary(sessionId));
}

export async function deleteSessionData(sessionId: string, confirmId: string): Promise<AdminResult> {
  const res = await asAdmin(() => core.deleteSessionData(sessionId, confirmId));
  if (!res.ok) return res;
  redirect('/admin');
}
