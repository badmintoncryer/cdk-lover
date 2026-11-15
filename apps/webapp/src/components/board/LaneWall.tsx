'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const STEP_MS = 6_000;

export type Lane = { key: string; header: ReactNode; notes: ReactNode };

/**
 * One lane per category, side by side, each scrolling on its own. A long note only makes its own
 * lane longer: it can never be cut across columns or push another category out of place.
 *
 * Text is the largest size at which the fullest lane still fits, so on a projector a quiet board
 * stays readable from the back and a busy one shrinks instead of hiding notes. Below the readable
 * minimum the lanes scroll instead. A projector has nobody to scroll, so there an overflowing lane
 * steps down a screen at a time and wraps around; phones scroll with a finger.
 */
export function LaneWall({ lanes, className }: { lanes: Lane[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const bodies = () => [...el.querySelectorAll<HTMLElement>('[data-lane-body]')];

    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Capped near the old fixed card text (~24px at 1080p): a sparse board blown up to fill the
      // screen read as shouting, so few notes leave room rather than grow.
      const max = Math.max(14, Math.min(h * 0.022, w * 0.0125));
      // A phone is read at arm's length; a projector from the back of the room.
      const min = Math.max(12, Math.min(h * 0.016, max));
      const overflows = (px: number) => {
        el.style.fontSize = `${px}px`;
        return bodies().some((b) => b.scrollHeight > b.clientHeight + 1);
      };
      if (!overflows(max)) return edges();
      let lo = min;
      let hi = max;
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        if (overflows(mid)) hi = mid;
        else lo = mid;
      }
      el.style.fontSize = `${lo}px`;
      edges();
    };
    // Fade the bottom of a lane while more notes wait below, so it reads as scrollable.
    const edges = () => {
      for (const b of bodies()) b.toggleAttribute('data-more', b.scrollTop + b.clientHeight < b.scrollHeight - 1);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    const step = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      ? setInterval(() => {
          if (el.matches(':hover')) return;
          for (const b of bodies()) {
            if (b.scrollHeight <= b.clientHeight + 1) continue;
            const atEnd = b.scrollTop + b.clientHeight >= b.scrollHeight - 1;
            b.scrollTo({ top: atEnd ? 0 : b.scrollTop + b.clientHeight * 0.8, behavior: 'smooth' });
          }
        }, STEP_MS)
      : undefined;

    fit();
    el.addEventListener('scroll', edges, { passive: true, capture: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(el);
    // Attributes are left out: `fit` itself writes the style attribute.
    const content = new MutationObserver(schedule);
    content.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(step);
      el.removeEventListener('scroll', edges, { capture: true });
      resize.disconnect();
      content.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        // Four lanes share the width; on a narrow portrait phone they keep a readable width and swipe.
        'no-scrollbar grid snap-x snap-mandatory auto-cols-[minmax(13em,1fr)] grid-flow-col grid-rows-[minmax(0,1fr)] gap-[0.75em] overflow-x-auto',
        className,
      )}
    >
      {lanes.map((lane) => (
        <section key={lane.key} className="flex min-h-0 min-w-0 snap-start flex-col">
          {lane.header}
          <div
            data-lane-body
            className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain data-more:[mask-image:linear-gradient(to_bottom,black_calc(100%-2rem),transparent)]"
          >
            {lane.notes}
          </div>
        </section>
      ))}
    </div>
  );
}
