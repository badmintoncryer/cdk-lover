'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { deleteOpinion, toggleVote, updateOpinion } from '@/app/actions';
import type { OpinionView } from '@/lib/data';
import { CATEGORIES, categoryLabel, t, type Category, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CATEGORY_STYLE } from './categories';

export function displayText(o: Pick<OpinionView, 'body' | 'bodyEn' | 'bodyJa'>, lang: Lang) {
  return lang === 'ja' ? o.bodyJa : o.bodyEn;
}

export function OpinionCard({
  o,
  lang,
  sessionId,
  canVote,
}: {
  o: OpinionView;
  lang: Lang;
  sessionId: string;
  canVote: boolean;
}) {
  const router = useRouter();
  const [showOriginal, setShowOriginal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(o.body);
  const [category, setCategory] = useState<Category>(o.category as Category);
  const [pending, start] = useTransition();
  const translated = o.sourceLang !== lang;
  const text = showOriginal ? o.body : displayText(o, lang);

  const run = (fn: () => Promise<{ ok: boolean }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(t(lang, 'error'));
      router.refresh();
    });

  return (
    <article
      className={cn(
        'rounded-xl border-2 p-3 flex flex-col gap-2 shadow-sm',
        CATEGORY_STYLE[o.category],
        pending && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className="font-semibold">{categoryLabel(lang, o.category)}</span>
        <span className="rounded bg-white/70 px-1.5">{o.groupName}</span>
        {o.mine && <span className="rounded bg-slate-900 px-1.5 text-white">me</span>}
      </div>

      {editing ? (
        <div className="space-y-2">
          <select
            className="rounded border px-2 py-1 text-sm bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(lang, c)}
              </option>
            ))}
          </select>
          <textarea
            className="w-full rounded border px-2 py-1 text-sm"
            rows={3}
            maxLength={400}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex gap-2 text-xs">
            <button
              className="rounded bg-slate-900 px-3 py-1 text-white"
              onClick={() =>
                run(async () => {
                  const r = await updateOpinion({ sessionId, opinionId: o.id, category, body });
                  if (r.ok) setEditing(false);
                  return r;
                })
              }
            >
              {t(lang, 'save')}
            </button>
            <button className="rounded border px-3 py-1" onClick={() => setEditing(false)}>
              {t(lang, 'cancel')}
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
      )}

      <div className="mt-auto flex items-center gap-2 text-xs">
        <button
          disabled={!canVote || pending}
          onClick={() => run(() => toggleVote(sessionId, o.id))}
          className={cn(
            'rounded-full border px-3 py-1 font-semibold',
            o.votedByMe ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white',
            !canVote && 'cursor-default',
          )}
        >
          👍 +1 <span className="ml-1 tabular-nums">{o.votes}</span>
        </button>
        {translated && (
          <button className="text-slate-500 underline" onClick={() => setShowOriginal((v) => !v)}>
            {showOriginal ? t(lang, 'showTranslation') : t(lang, 'showOriginal')}
          </button>
        )}
        {o.mine && !editing && (
          <span className="ml-auto flex gap-2">
            <button className="text-slate-600 underline" onClick={() => setEditing(true)}>
              {t(lang, 'edit')}
            </button>
            <button
              className="text-rose-600 underline"
              onClick={() => confirm(t(lang, 'confirmDelete')) && run(() => deleteOpinion(sessionId, o.id))}
            >
              {t(lang, 'delete')}
            </button>
          </span>
        )}
      </div>
    </article>
  );
}
