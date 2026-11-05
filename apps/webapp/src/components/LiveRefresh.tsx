'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { useEventBus } from '@/hooks/use-event-bus';

/**
 * Re-renders the server components when anything in the session changes. WebSocket events give
 * near-instant updates; the interval poll covers dropped connections on venue Wi-Fi.
 */
export function LiveRefresh({ sessionId, pollMs = 10_000 }: { sessionId: string; pollMs?: number }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(() => {
    clearTimeout(timer.current);
    // Coalesce bursts (e.g. many +1s at once) into one refetch.
    timer.current = setTimeout(() => router.refresh(), 400);
  }, [router]);

  useEventBus({ channelName: `public/session-${sessionId}`, onReceived: refresh });

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, pollMs);
    const onVisible = () => document.visibilityState === 'visible' && router.refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router, pollMs]);

  return null;
}
