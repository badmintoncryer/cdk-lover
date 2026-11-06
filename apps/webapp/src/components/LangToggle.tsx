'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLang } from '@/app/actions';
import type { Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const choose = (l: Lang) =>
    l !== lang &&
    start(async () => {
      await setLang(l);
      router.refresh();
    });
  return (
    <fieldset
      aria-label="Language"
      className={cn('inline-flex rounded-md bg-white/8 p-0.5 text-xs', pending && 'opacity-60')}
    >
      {(['ja', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={lang === l}
          className={cn(
            'h-7 rounded-[4px] px-2.5 font-medium transition-colors',
            lang === l ? 'bg-white/14 text-white' : 'text-slate-400 hover:text-white',
          )}
        >
          {l === 'ja' ? '日本語' : 'EN'}
        </button>
      ))}
    </fieldset>
  );
}
