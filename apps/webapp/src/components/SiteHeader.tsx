import Link from 'next/link';
import { LangToggle } from './LangToggle';
import type { Lang } from '@/lib/i18n';

export function SiteHeader({ lang, title, children }: { lang: Lang; title?: string; children?: React.ReactNode }) {
  return (
    <header className="bg-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-3">
        <Link href="/" className="font-bold text-lg tracking-tight">
          <span className="text-orange-400">CDK</span> Lover 💜
        </Link>
        {title && <span className="text-slate-300 text-sm truncate">{title}</span>}
        <nav className="flex gap-1 text-sm">{children}</nav>
        <div className="ml-auto">
          <LangToggle lang={lang} />
        </div>
      </div>
    </header>
  );
}
