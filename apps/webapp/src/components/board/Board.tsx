'use client';

import { useMemo, useState } from 'react';
import type { GroupRow, OpinionView } from '@/lib/data';
import { CATEGORIES, categoryLabel, t, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CATEGORY_SELECTED } from './categories';
import { Composer } from './Composer';
import { OpinionCard } from './OpinionCard';

const chip = (active: boolean, activeClass = 'bg-slate-900 text-white border-slate-900') =>
  cn(
    'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition',
    active ? activeClass : 'bg-card hover:bg-accent',
  );

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
  groups,
  myGroupId,
  opinions,
}: {
  lang: Lang;
  sessionId: string;
  canPost: boolean;
  canVote: boolean;
  groups: GroupRow[];
  myGroupId?: string;
  opinions: OpinionView[];
}) {
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<'new' | 'top'>('new');

  const inGroup = useMemo(
    () => opinions.filter((o) => groupFilter === 'all' || o.groupId === groupFilter),
    [opinions, groupFilter],
  );
  const shown = useMemo(() => {
    const list = inGroup.filter((o) => category === 'all' || o.category === category);
    if (sort === 'top') return [...list].sort((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [inGroup, category, sort]);
  const countOf = (c: string) => inGroup.filter((o) => o.category === c).length;

  return (
    <div className="space-y-4">
      {canPost && myGroupId && <Composer lang={lang} sessionId={sessionId} groups={groups} myGroupId={myGroupId} />}

      <div className="space-y-2">
        <ChipRow label={t(lang, 'filterGroup')}>
          <button type="button" className={chip(groupFilter === 'all')} onClick={() => setGroupFilter('all')}>
            {t(lang, 'allGroups')}
          </button>
          {myGroupId && (
            <button type="button" className={chip(groupFilter === myGroupId)} onClick={() => setGroupFilter(myGroupId)}>
              ⭐ {t(lang, 'myGroup')}
            </button>
          )}
          {groups
            .filter((g) => g.id !== myGroupId)
            .map((g) => (
              <button
                type="button"
                key={g.id}
                className={chip(groupFilter === g.id)}
                onClick={() => setGroupFilter(g.id)}
              >
                {g.name}
              </button>
            ))}
        </ChipRow>
        <ChipRow label={t(lang, 'category')}>
          <button type="button" className={chip(category === 'all')} onClick={() => setCategory('all')}>
            {t(lang, 'allCategories')} <span className="opacity-60 tabular-nums">{inGroup.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              className={chip(category === c, CATEGORY_SELECTED[c])}
              onClick={() => setCategory(c)}
            >
              {categoryLabel(lang, c)} <span className="opacity-60 tabular-nums">{countOf(c)}</span>
            </button>
          ))}
        </ChipRow>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{shown.length}</span> {t(lang, 'notes')}
        </p>
        <fieldset className="inline-flex rounded-full border bg-card p-0.5 text-xs">
          {(['new', 'top'] as const).map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className={cn(
                'rounded-full px-3 py-1 font-medium transition',
                sort === s ? 'bg-slate-900 text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s === 'new' ? t(lang, 'sortNew') : t(lang, 'sortTop')}
            </button>
          ))}
        </fieldset>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-14 text-center">
          <div className="text-4xl" aria-hidden>
            🗒️
          </div>
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
