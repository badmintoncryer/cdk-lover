import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { listSessions } from '@/lib/data';
import { getLang } from '@/lib/identity';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [lang, sessions] = await Promise.all([getLang(), listSessions()]);
  return (
    <>
      <SiteHeader lang={lang} />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold">{t(lang, 'tagline')}</h1>
        <h2 className="text-sm font-semibold text-slate-500 uppercase">{t(lang, 'sessions')}</h2>
        {sessions.length === 0 ? (
          <p className="text-slate-500">{t(lang, 'noSessions')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/s/${s.id}`}
                  className="block rounded-xl border bg-white p-5 shadow-sm hover:border-orange-400 transition"
                >
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {s.status === 'open' ? '🟢 open' : '⚪ closed'} · /s/{s.id}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
