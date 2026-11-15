'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const PAN_MS = 8_000;

/**
 * A multi-column wall of notes whose text size is the largest that keeps every note on screen.
 * Columns are sized in `em`, so a smaller font also means more columns: a busy board trades size
 * for count instead of hiding notes below the fold, which the projector cannot scroll to. Below
 * the readable minimum the extra columns overflow sideways, so phones can still swipe to them.
 * Columns only fill top-down where the page has a fixed height; elsewhere the page scrolls and
 * the columns balance.
 */
export function FitWall({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;

    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const max = Math.max(16, Math.min(h * 0.05, w * 0.026));
      // A phone is read at arm's length; a projector from the back of the room.
      const min = Math.max(12, Math.min(h * 0.018, max));
      const overflows = (px: number) => {
        el.style.fontSize = `${px}px`;
        return el.scrollWidth > el.clientWidth + 1;
      };
      if (!overflows(max)) return edge();
      let lo = min;
      let hi = max;
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        if (overflows(mid)) hi = mid;
        else lo = mid;
      }
      el.style.fontSize = `${lo}px`;
      edge();
    };
    // Fade the right edge while more columns wait off-screen, so phones know to swipe.
    const edge = () => {
      el.toggleAttribute('data-more', el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    // A projector has nobody to swipe, so when notes still don't fit the wall pans one column at a
    // time and wraps around; otherwise the last category would never be shown. Phones swipe instead.
    const pan = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      ? setInterval(() => {
          if (el.scrollWidth <= el.clientWidth + 1 || el.matches(':hover')) return;
          const cs = getComputedStyle(el);
          const step = parseFloat(cs.columnWidth) + parseFloat(cs.columnGap);
          const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
          el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: 'smooth' });
        }, PAN_MS)
      : undefined;

    fit();
    el.addEventListener('scroll', edge, { passive: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(el);
    // Attributes are left out: `fit` itself writes the style attribute.
    const content = new MutationObserver(schedule);
    content.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(pan);
      el.removeEventListener('scroll', edge);
      resize.disconnect();
      content.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'no-scrollbar overflow-x-auto [column-width:15em] short:[column-width:12.5em] xl:[column-fill:auto] short:[column-fill:auto] overflow-y-hidden data-more:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]',
        className,
      )}
      style={{ columnGap: '0.75em' }}
    >
      {children}
    </div>
  );
}
