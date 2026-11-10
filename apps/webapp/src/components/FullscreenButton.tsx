'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';

const noSubscribe = () => () => {};

export function FullscreenButton({ label, className }: { label: string; className?: string }) {
  const [on, setOn] = useState(false);
  // iPhone Safari has no Fullscreen API for pages, so the button would do nothing there.
  const supported = useSyncExternalStore(
    noSubscribe,
    () => !!document.fullscreenEnabled,
    () => false,
  );
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  if (!supported) return null;
  return (
    <button
      type="button"
      className={className}
      title={label}
      aria-label={label}
      onClick={() =>
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
      }
    >
      {on ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
    </button>
  );
}
