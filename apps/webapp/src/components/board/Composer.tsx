'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { changeGroup, createOpinion } from '@/app/actions';
import type { GroupRow } from '@/lib/data';
import { CATEGORIES, categoryLabel, t, type Category, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CATEGORY_CHIP } from './categories';

export function Composer({
  lang,
  sessionId,
  groups,
  myGroupId,
}: {
  lang: Lang;
  sessionId: string;
  groups: GroupRow[];
  myGroupId: string;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('good');
  const [body, setBody] = useState('');
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    start(async () => {
      const res = await createOpinion({ sessionId, groupId: myGroupId, category, body });
      if (!res.ok) {
        toast.error(res.error === 'limit' ? t(lang, 'tooMany') : t(lang, 'error'));
        return;
      }
      setBody('');
      router.refresh();
    });
  };

  const onGroup = (groupId: string) =>
    start(async () => {
      await changeGroup(sessionId, groupId);
      router.refresh();
    });

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              'rounded-full px-3 py-1 text-sm border',
              category === c ? `${CATEGORY_CHIP[c]} text-white border-transparent` : 'bg-white',
            )}
          >
            {categoryLabel(lang, c)}
          </button>
        ))}
        <label className="ml-auto text-xs text-slate-500 flex items-center gap-2">
          {t(lang, 'yourGroup')}
          <select
            className="rounded border px-2 py-1 bg-white text-slate-900"
            value={myGroupId}
            onChange={(e) => onGroup(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={400}
        rows={3}
        placeholder={t(lang, 'postPlaceholder')}
        className="w-full rounded-lg border px-3 py-2"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
        }}
      />
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {t(lang, 'anonymousNote')} {body.length}/400
        </span>
        <button
          disabled={pending || !body.trim()}
          className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? t(lang, 'posting') : t(lang, 'post')}
        </button>
      </div>
    </form>
  );
}
