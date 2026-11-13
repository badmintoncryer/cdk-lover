'use client';

import { Timer } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { CategoryDot } from '@/components/board/categories';
import { categoryLabel, t, type Lang } from '@/lib/i18n';
import { PHASE_INFO, PHASES, type PhaseState } from '@/lib/phases';
import { cn } from '@/lib/utils';

/** A one-second clock shared by every countdown on the page. Null on the server so hydration matches. */
const clock = {
  subscribe(cb: () => void) {
    const id = setInterval(cb, 1000);
    return () => clearInterval(id);
  },
  now: () => Math.floor(Date.now() / 1000),
  server: () => null,
};

function useNowSeconds(): number | null {
  return useSyncExternalStore(clock.subscribe, clock.now, clock.server);
}

function formatLeft(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * What the room is doing now, set by the organizer from the admin page. There is no projector,
 * so this banner (on every phone) is the agenda slide: step, question, category and time left.
 */
export function PhaseBanner({ state, lang, dark = false }: { state: PhaseState; lang: Lang; dark?: boolean }) {
  const now = useNowSeconds();
  if (!state) return null;
  const info = PHASE_INFO[state.phase];
  const index = PHASES.indexOf(state.phase);
  const endsAt = state.endsAt ? Math.floor(new Date(state.endsAt).getTime() / 1000) : null;
  const left = endsAt !== null && now !== null ? Math.max(0, endsAt - now) : null;

  return (
    <section
      aria-live="polite"
      className={cn(
        'rounded-xl border p-4 sm:p-5',
        dark ? 'border-white/10 bg-white/[0.06] text-slate-100 short:p-2.5' : 'border-brand/30 bg-brand/5',
      )}
    >
      <div className="flex items-center gap-3 text-xs font-medium">
        <span className={cn('uppercase tracking-wide', dark ? 'text-slate-400' : 'text-muted-foreground')}>
          {t(lang, 'phaseNow')} · {index + 1}/{PHASES.length} {info.name[lang]}
        </span>
        {left !== null && (
          <span
            className={cn(
              'ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-sm tabular-nums',
              left === 0
                ? 'bg-rose-600 text-white'
                : dark
                  ? 'bg-white/10 text-white'
                  : 'bg-card text-foreground ring-1 ring-border',
            )}
          >
            <Timer className="size-3.5" aria-hidden />
            {left === 0
              ? t(lang, 'phaseTimeUp')
              : lang === 'ja'
                ? `残り ${formatLeft(left)}`
                : `${formatLeft(left)} left`}
          </span>
        )}
      </div>
      <ol aria-hidden className={cn('mt-2 flex gap-1', dark && 'short:hidden')}>
        {PHASES.map((p, i) => (
          <li
            key={p}
            className={cn(
              'h-1 flex-1 rounded-full',
              i <= index ? (dark ? 'bg-white/70' : 'bg-brand') : dark ? 'bg-white/10' : 'bg-border',
            )}
          />
        ))}
      </ol>
      <h2 className={cn('mt-3 text-lg font-semibold leading-snug sm:text-xl', dark && 'short:mt-0.5 short:text-sm')}>
        {info.title[lang]}
      </h2>
      <p
        className={cn('mt-1 text-sm leading-relaxed', dark ? 'text-slate-300 short:text-xs' : 'text-muted-foreground')}
      >
        {info.prompt[lang]}
      </p>
      {info.category && (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-2 text-xs',
            dark ? 'text-slate-400' : 'text-muted-foreground',
          )}
        >
          {t(lang, 'phasePostAs')}:
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <CategoryDot category={info.category} />
            <span className={dark ? 'text-slate-100' : undefined}>{categoryLabel(lang, info.category)}</span>
          </span>
        </p>
      )}
    </section>
  );
}
