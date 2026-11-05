import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JoinQr } from '@/components/JoinQr';
import { LiveRefresh } from '@/components/LiveRefresh';
import { Markdown } from '@/components/Markdown';
import { getSession, listGroups, listOpinions } from '@/lib/data';
import { CATEGORIES, categoryLabel, isLang, t } from '@/lib/i18n';
import { CATEGORY_CHIP, CATEGORY_STYLE } from '@/components/board/categories';

export const dynamic = 'force-dynamic';

const tab = (active: boolean) =>
  `rounded-full px-3 py-1 ${active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10'}`;

/** Projector view for the room and the CDK team. Defaults to English. */
export default async function ScreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ lang?: string; view?: string; group?: string }>;
}) {
  const { sessionId } = await params;
  const sp = await searchParams;
  const session = await getSession(sessionId);
  if (!session) notFound();
  const lang = isLang(sp.lang) ? sp.lang : 'en';
  const view = sp.view === 'summary' ? 'summary' : 'notes';
  const [opinions, groups] = await Promise.all([listOpinions(sessionId), listGroups(sessionId)]);
  const filtered = sp.group ? opinions.filter((o) => o.groupId === sp.group) : opinions;
  const summary = lang === 'ja' ? session.summaryJa : session.summaryEn;

  const q = (patch: Record<string, string | undefined>) => {
    const next = { lang, view, group: sp.group, ...patch };
    const s = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `?${s.toString()}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <LiveRefresh sessionId={sessionId} pollMs={8_000} />
      <header className="flex flex-wrap items-center gap-4 px-6 py-4">
        <h1 className="text-3xl font-black tracking-tight">
          <span className="text-orange-400">CDK</span> Lover 💜{' '}
          <span className="text-slate-400 text-xl font-semibold">{session.title}</span>
        </h1>
        <nav className="flex gap-1 text-sm">
          <Link className={tab(view === 'notes')} href={q({ view: 'notes' })}>
            Notes ({filtered.length})
          </Link>
          <Link className={tab(view === 'summary')} href={q({ view: 'summary' })}>
            {t(lang, 'summary')}
          </Link>
          <span className="mx-2 border-l border-white/20" />
          <Link className={tab(!sp.group)} href={q({ group: undefined })}>
            {t(lang, 'allGroups')}
          </Link>
          {groups.map((g) => (
            <Link key={g.id} className={tab(sp.group === g.id)} href={q({ group: g.id })}>
              {g.name}
            </Link>
          ))}
          <span className="mx-2 border-l border-white/20" />
          <Link className={tab(lang === 'en')} href={q({ lang: 'en' })}>
            EN
          </Link>
          <Link className={tab(lang === 'ja')} href={q({ lang: 'ja' })}>
            JA
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-300">{t(lang, 'scanToJoin')} →</span>
          <JoinQr path={`/s/${sessionId}`} size={120} />
        </div>
      </header>

      {view === 'summary' ? (
        <main className="mx-auto max-w-5xl px-6 pb-12">
          {summary ? (
            <div className="rounded-2xl bg-white p-8 text-slate-900 text-xl leading-relaxed">
              <Markdown text={summary} className="space-y-3" />
            </div>
          ) : (
            <p className="py-24 text-center text-2xl text-slate-500">No summary yet</p>
          )}
        </main>
      ) : (
        <main className="grid gap-4 px-6 pb-12 md:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((c) => {
            const items = filtered.filter((o) => o.category === c).sort((a, b) => b.votes - a.votes);
            return (
              <section key={c} className="space-y-3">
                <h2 className={`rounded-lg px-3 py-2 text-xl font-bold ${CATEGORY_CHIP[c]}`}>
                  {categoryLabel(lang, c)} <span className="opacity-70">({items.length})</span>
                </h2>
                {items.map((o) => (
                  <article key={o.id} className={`rounded-xl border-2 p-3 text-slate-900 ${CATEGORY_STYLE[c]}`}>
                    <p className="text-lg leading-snug whitespace-pre-wrap break-words">
                      {lang === 'ja' ? o.bodyJa : o.bodyEn}
                    </p>
                    <div className="mt-2 flex justify-between text-sm text-slate-600">
                      <span>{o.groupName}</span>
                      <span className="font-bold text-orange-600">+{o.votes}</span>
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}
