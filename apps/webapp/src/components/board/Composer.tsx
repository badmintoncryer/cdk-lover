'use client';

import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createOpinion } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { PublicNotice } from '@/components/PublicNotice';
import { CATEGORIES, categoryLabel, t, type Category, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CATEGORY_SELECTED, CategoryDot } from './categories';

const MAX = 400;

export function Composer({ lang, sessionId }: { lang: Lang; sessionId: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('good');
  const [body, setBody] = useState('');
  const [pending, start] = useTransition();
  const textarea = useRef<HTMLTextAreaElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || pending) return;
    start(async () => {
      const res = await createOpinion({ sessionId, category, body });
      if (!res.ok) {
        toast.error(res.error === 'limit' ? t(lang, 'tooMany') : t(lang, 'error'));
        return;
      }
      setBody('');
      toast.success(t(lang, 'posted'));
      router.refresh();
      textarea.current?.focus();
    });
  };

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3 p-4 sm:p-5">
        <h2 className="font-semibold">{t(lang, 'newNote')}</h2>

        <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <legend className="sr-only">{t(lang, 'category')}</legend>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              aria-pressed={category === c}
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
                category === c ? CATEGORY_SELECTED[c] : 'bg-card text-secondary-foreground hover:bg-secondary',
              )}
            >
              <CategoryDot category={c} />
              {categoryLabel(lang, c)}
            </button>
          ))}
        </fieldset>

        <Textarea
          ref={textarea}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX}
          rows={3}
          placeholder={t(lang, 'postPlaceholder')}
          enterKeyHint="send"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
          }}
        />

        <PublicNotice>{t(lang, 'anonymousNote')}</PublicNotice>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <p className="hidden text-xs text-muted-foreground sm:block">{t(lang, 'sendHint')}</p>
          <span
            className={cn(
              'ml-auto hidden text-xs tabular-nums sm:inline',
              body.length > MAX - 40 ? 'text-rose-600' : 'text-muted-foreground',
            )}
          >
            {body.length}/{MAX}
          </span>
          <Button type="submit" size="lg" disabled={pending || !body.trim()} className="w-full sm:h-10 sm:w-auto">
            <Send />
            {pending ? t(lang, 'posting') : t(lang, 'post')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
