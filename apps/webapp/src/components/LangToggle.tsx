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
    start(async () => {
      await setLang(l);
      router.refresh();
    });
  return (
    <div className={cn('inline-flex rounded-full border border-white/40 text-xs', pending && 'opacity-60')}>
      {(['ja', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          className={cn('px-3 py-1 rounded-full', lang === l ? 'bg-white text-slate-900' : 'text-white')}
        >
          {l === 'ja' ? '日本語' : 'English'}
        </button>
      ))}
    </div>
  );
}
