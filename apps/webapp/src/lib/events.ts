import { sendEvent } from '@repo/event-utils/send-event';

export const sessionChannel = (sessionId: string) => `public/session-${sessionId}`;

/** Tells every open board/screen of the session to refetch. Best effort: polling covers misses. */
export async function notifySession(sessionId: string) {
  try {
    await sendEvent(sessionChannel(sessionId), { type: 'update', at: Date.now() });
  } catch (e) {
    console.error(JSON.stringify({ msg: 'notify failed', sessionId, error: String(e) }));
  }
}
