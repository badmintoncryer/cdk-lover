'use client';

import { Languages, Pencil, ThumbsUp, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { deleteOpinion, toggleVote, updateOpinion } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import type { OpinionView } from '@/lib/data';
import { CATEGORIES, categoryLabel, t, type Category, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CATEGORY_SELECTED, CATEGORY_STYLE, CategoryDot } from './categories';

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
  const [voting, startVote] = useTransition();
  // +1 is the most frequent tap in the room; reflect it before the round trip on venue Wi-Fi.
  const [vote, setVote] = useOptimistic({ voted: o.votedByMe, count: o.votes });
  // A post saved untranslated (model error or budget exhausted) shows its original text: no label.
  const translated = o.sourceLang !== lang && displayText(o, lang) !== o.body;
  const text = showOriginal ? o.body : displayText(o, lang);

  const run = (fn: () => Promise<{ ok: boolean }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(t(lang, 'error'));
      router.refresh();
    });

  const onVote = () =>
    startVote(async () => {
      setVote((v) => ({ voted: !v.voted, count: v.count + (v.voted ? -1 : 1) }));
      const res = await toggleVote(sessionId, o.id);
      if (!res.ok) toast.error(t(lang, 'error'));
      router.refresh();
    });

  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-t-4 p-4 pb-3 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-opacity',
        CATEGORY_STYLE[o.category],
        o.mine && 'ring-1 ring-slate-900/15',
        pending && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-medium">{categoryLabel(lang, o.category)}</span>
        <span className="font-mono text-slate-500">{o.groupName}</span>
        {o.mine && <span className="ml-auto font-medium text-slate-900">{t(lang, 'me')}</span>}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium',
                  category === c ? CATEGORY_SELECTED[c] : 'bg-white',
                )}
              >
                <CategoryDot category={c} />
                {categoryLabel(lang, c)}
              </button>
            ))}
          </div>
          <Textarea rows={3} maxLength={400} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="dark"
              disabled={pending || !body.trim()}
              onClick={() =>
                run(async () => {
                  const r = await updateOpinion({ sessionId, opinionId: o.id, category, body });
                  if (r.ok) setEditing(false);
                  return r;
                })
              }
            >
              {t(lang, 'save')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBody(o.body);
                setCategory(o.category as Category);
                setEditing(false);
              }}
            >
              {t(lang, 'cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-900">{text}</p>
      )}

      <div className="mt-auto flex items-center gap-1 pt-1">
        <button
          type="button"
          disabled={!canVote}
          onClick={onVote}
          aria-pressed={vote.voted}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-[color,background-color,border-color,transform] active:scale-[0.97]',
            vote.voted
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-slate-900/10 bg-white/70 text-slate-700 hover:border-primary/60 hover:text-primary',
            !canVote && 'cursor-default opacity-80 hover:border-slate-900/10 hover:text-slate-700',
            voting && 'opacity-80',
          )}
        >
          <ThumbsUp className="size-3.5" />
          <span className="tabular-nums">{vote.count}</span>
        </button>
        {translated && !editing && (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-800"
            onClick={() => setShowOriginal((v) => !v)}
            title={showOriginal ? t(lang, 'showTranslation') : t(lang, 'showOriginal')}
          >
            <Languages className="size-3.5" />
            {showOriginal ? t(lang, 'showTranslation') : `${t(lang, 'autoTranslated')} · ${t(lang, 'showOriginal')}`}
          </button>
        )}
        {o.mine && !editing && (
          <span className="ml-auto flex">
            <button
              type="button"
              aria-label={t(lang, 'edit')}
              title={t(lang, 'edit')}
              className="grid size-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-900"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t(lang, 'delete')}
              title={t(lang, 'delete')}
              className="grid size-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-white/80 hover:text-rose-600"
              onClick={() => confirm(t(lang, 'confirmDelete')) && run(() => deleteOpinion(sessionId, o.id))}
            >
              <Trash2 className="size-4" />
            </button>
          </span>
        )}
      </div>
    </article>
  );
}
