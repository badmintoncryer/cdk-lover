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

  // Throttle, not debounce: a steady stream of +1s in the room would keep resetting a debounce and
  // starve the board until the next poll. This refetches at most once per second during a burst,
  // which also bounds the Lambda renders each open board causes.
  const refresh = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      router.refresh();
    }, 1000);
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
