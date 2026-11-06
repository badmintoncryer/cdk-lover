import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Logo, SiteHeader } from '@/components/SiteHeader';
import { listSessions } from '@/lib/data';
import { getLang } from '@/lib/identity';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [lang, sessions] = await Promise.all([getLang(), listSessions()]);
  // Open sessions first: on the day, attendees should land on the live one without scanning the list.
  const sorted = [...sessions].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open'));
  return (
    <>
      <SiteHeader lang={lang} />
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <section className="py-10 text-center sm:py-14">
          <h1 className="text-4xl sm:text-5xl">
            <Logo />
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground sm:text-lg">{t(lang, 'tagline')}</p>
          <p className="mt-2 text-xs text-muted-foreground">AWS re:Invent · Community session</p>
        </section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t(lang, 'sessions')}
        </h2>
        {sorted.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-8 text-center text-muted-foreground">
            {t(lang, 'noSessions')}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sorted.map((s) => {
              const open = s.status === 'open';
              return (
                <li key={s.id}>
                  <Link
                    href={`/s/${s.id}`}
                    className={cn(
                      'group flex items-center gap-3 rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                      open && 'border-primary/40 ring-1 ring-primary/20',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                          open ? 'bg-emerald-100 text-emerald-800' : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            open ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400',
                          )}
                        />
                        {open ? t(lang, 'open') : t(lang, 'closedShort')}
                      </span>
                      <div className="mt-2 truncate font-semibold">{s.title}</div>
                    </div>
                    <ArrowRight className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
