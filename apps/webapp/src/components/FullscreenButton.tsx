'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useEffect, useState } from 'react';

export function FullscreenButton({ label, className }: { label: string; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
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
