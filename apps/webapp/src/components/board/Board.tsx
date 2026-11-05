'use client';

import { useMemo, useState } from 'react';
import type { GroupRow, OpinionView } from '@/lib/data';
import { CATEGORIES, categoryLabel, t, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Composer } from './Composer';
import { OpinionCard } from './OpinionCard';

const chip = (active: boolean) =>
  cn('rounded-full border px-3 py-1 text-sm whitespace-nowrap', active ? 'bg-slate-900 text-white' : 'bg-white');

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

  const shown = useMemo(() => {
    const list = opinions.filter(
      (o) => (groupFilter === 'all' || o.groupId === groupFilter) && (category === 'all' || o.category === category),
    );
    if (sort === 'top') return [...list].sort((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [opinions, groupFilter, category, sort]);

  return (
    <div className="space-y-4">
      {canPost && myGroupId && <Composer lang={lang} sessionId={sessionId} groups={groups} myGroupId={myGroupId} />}

      <div className="flex flex-wrap items-center gap-2">
        <button className={chip(groupFilter === 'all')} onClick={() => setGroupFilter('all')}>
          {t(lang, 'allGroups')}
        </button>
        {myGroupId && (
          <button className={chip(groupFilter === myGroupId)} onClick={() => setGroupFilter(myGroupId)}>
            {t(lang, 'myGroup')}
          </button>
        )}
        {groups
          .filter((g) => g.id !== myGroupId)
          .map((g) => (
            <button key={g.id} className={chip(groupFilter === g.id)} onClick={() => setGroupFilter(g.id)}>
              {g.name}
            </button>
          ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className={chip(category === 'all')} onClick={() => setCategory('all')}>
          {t(lang, 'allCategories')}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} className={chip(category === c)} onClick={() => setCategory(c)}>
            {categoryLabel(lang, c)}
          </button>
        ))}
        <select
          className="ml-auto rounded border px-2 py-1 text-sm bg-white"
          value={sort}
          onChange={(e) => setSort(e.target.value as 'new' | 'top')}
        >
          <option value="new">{t(lang, 'sortNew')}</option>
          <option value="top">{t(lang, 'sortTop')}</option>
        </select>
      </div>

      <p className="text-xs text-slate-500">
        {shown.length} {t(lang, 'notes')}
      </p>
      {shown.length === 0 ? (
        <p className="py-12 text-center text-slate-400">{t(lang, 'empty')}</p>
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
