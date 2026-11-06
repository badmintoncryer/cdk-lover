import { Heart } from 'lucide-react';
import Link from 'next/link';
import { LangToggle } from './LangToggle';
import type { Lang } from '@/lib/i18n';

/** Wordmark: the CDK orange on "CDK" and a flat heart, nothing else. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.25em] font-semibold tracking-tight ${className}`}>
      <span>
        <span className="text-brand">CDK</span> Lover
      </span>
      <Heart aria-hidden className="size-[0.8em] fill-current text-brand" strokeWidth={0} />
    </span>
  );
}

export function SiteHeader({ lang, title, children }: { lang: Lang; title?: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-900 text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 text-lg">
          <Logo />
        </Link>
        {title && (
          <span className="hidden min-w-0 truncate border-l border-white/15 pl-4 text-sm text-slate-400 sm:block">
            {title}
          </span>
        )}
        {children && <div className="hidden md:ml-2 md:block">{children}</div>}
        <div className="ml-auto shrink-0">
          <LangToggle lang={lang} />
        </div>
      </div>
      {children && <div className="border-t border-white/10 px-2 py-1.5 md:hidden">{children}</div>}
    </header>
  );
}
