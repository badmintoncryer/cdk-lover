'use client';

import { StickyNote } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { OpinionView } from '@/lib/data';
import { CATEGORIES, categoryLabel, t, type Lang } from '@/lib/i18n';
import { PHASE_INFO, type PhaseState } from '@/lib/phases';
import { cn } from '@/lib/utils';
import { CATEGORY_STYLE, CategoryDot } from './categories';
import { useCurrentPhase } from '@/components/phase/PhaseBanner';
import { Composer } from './Composer';
import { OpinionCard } from './OpinionCard';

const chip = (active: boolean) =>
  cn(
    'inline-flex h-8 shrink-0 items-center gap-2 rounded-md border px-3 text-sm whitespace-nowrap transition-colors',
    active ? 'border-slate-900 bg-slate-900 text-white' : 'bg-card text-secondary-foreground hover:bg-secondary',
  );

const count = 'font-mono text-xs tabular-nums opacity-60';

/** Single-line, swipeable on phones (wrapping chips pushed the notes below the fold). */
function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset
      aria-label={label}
      className="no-scrollbar -mx-4 min-w-0 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {children}
    </fieldset>
  );
}

export function Board({
  lang,
  sessionId,
  canPost,
  canVote,
  opinions,
  phase: storedPhase = null,
}: {
  lang: Lang;
  sessionId: string;
  canPost: boolean;
  canVote: boolean;
  opinions: OpinionView[];
  phase?: PhaseState;
}) {
  const phase = useCurrentPhase(storedPhase);
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<'new' | 'top'>('new');

  const shown = useMemo(() => {
    const list = opinions.filter((o) => category === 'all' || o.category === category);
    if (sort === 'top') return [...list].sort((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [opinions, category, sort]);
  const countOf = (c: string) => opinions.filter((o) => o.category === c).length;

  return (
    <div className="space-y-4">
      {phase?.phase === 'share' && <ShareTop lang={lang} opinions={opinions} />}
      {canPost && (
        <Composer
          lang={lang}
          sessionId={sessionId}
          phaseCategory={phase ? PHASE_INFO[phase.phase].category : undefined}
        />
      )}

      <div className="space-y-2">
        <ChipRow label={t(lang, 'category')}>
          <button type="button" className={chip(category === 'all')} onClick={() => setCategory('all')}>
            {t(lang, 'allCategories')} <span className={count}>{opinions.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button type="button" key={c} className={chip(category === c)} onClick={() => setCategory(c)}>
              <CategoryDot category={c} />
              {categoryLabel(lang, c)} <span className={count}>{countOf(c)}</span>
            </button>
          ))}
        </ChipRow>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{shown.length}</span> {t(lang, 'notes')}
        </p>
        <fieldset className="inline-flex rounded-lg border bg-card p-0.5 text-xs">
          {(['new', 'top'] as const).map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className={cn(
                'h-7 rounded-md px-3 font-medium transition-colors',
                sort === s ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s === 'new' ? t(lang, 'sortNew') : t(lang, 'sortTop')}
            </button>
          ))}
        </fieldset>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60 px-6 py-14 text-center">
          <StickyNote className="mx-auto size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 font-medium">{opinions.length === 0 ? t(lang, 'empty') : t(lang, 'noMatch')}</p>
          {opinions.length === 0 && canPost && (
            <p className="mt-1 text-sm text-muted-foreground">{t(lang, 'emptyHint')}</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((o) => (
            <OpinionCard key={o.id} o={o} lang={lang} sessionId={sessionId} canVote={canVote} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Share phase: the top notes per category, for the organizer to read out and the room to follow. */
function ShareTop({ lang, opinions }: { lang: Lang; opinions: OpinionView[] }) {
  const columns = CATEGORIES.map((c) => ({
    c,
    top: opinions
      .filter((o) => o.category === c && o.votes > 0)
      .sort((a, b) => b.votes - a.votes || a.createdAt.localeCompare(b.createdAt))
      .slice(0, 3),
  })).filter((col) => col.top.length > 0);
  if (columns.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t(lang, 'shareTitle')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map(({ c, top }) => (
          <div key={c} className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <CategoryDot category={c} />
              {categoryLabel(lang, c)}
            </h3>
            <ol className="space-y-2">
              {top.map((o) => (
                <li key={o.id} className={cn('flex gap-3 rounded-lg border border-t-4 p-3 text-sm', CATEGORY_STYLE[c])}>
                  <span className="flex-1 break-words whitespace-pre-wrap text-slate-900">
                    {lang === 'ja' ? o.bodyJa : o.bodyEn}
                  </span>
                  <span className="shrink-0 font-mono text-xs font-medium text-slate-700 tabular-nums">+{o.votes}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
