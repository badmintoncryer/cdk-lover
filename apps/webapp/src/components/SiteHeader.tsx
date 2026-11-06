import Link from 'next/link';
import { LangToggle } from './LangToggle';
import type { Lang } from '@/lib/i18n';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      <span className="text-brand">CDK</span> Lover <span aria-hidden>💜</span>
    </span>
  );
}

export function SiteHeader({ lang, title, children }: { lang: Lang; title?: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 text-white shadow-sm backdrop-blur supports-[backdrop-filter]:bg-slate-900/85">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="shrink-0 text-lg">
          <Logo />
        </Link>
        {title && (
          <span className="min-w-0 truncate rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-200 sm:text-sm">
            {title}
          </span>
        )}
        {children && <div className="hidden md:ml-2 md:block">{children}</div>}
        <div className="ml-auto shrink-0">
          <LangToggle lang={lang} />
        </div>
      </div>
      {children && <div className="border-t border-white/10 px-2 pb-1.5 pt-1 md:hidden">{children}</div>}
    </header>
  );
}
