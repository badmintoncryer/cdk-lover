import { StickyNote, ThumbsUp, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Credit } from '@/components/Credit';
import { FullscreenButton } from '@/components/FullscreenButton';
import { JoinQr } from '@/components/JoinQr';
import { LiveRefresh } from '@/components/LiveRefresh';
import { Markdown } from '@/components/Markdown';
import { Logo } from '@/components/SiteHeader';
import { CATEGORY_CHIP, CATEGORY_STYLE } from '@/components/board/categories';
import { getSession, listGroups, listOpinions } from '@/lib/data';
import { CATEGORIES, categoryLabel, isLang, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Notes younger than this get a NEW badge so the room notices fresh posts. */
const NEW_MS = 2 * 60_000;
const isFresh = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < NEW_MS;

const tab = (active: boolean) =>
  cn(
    'rounded-full px-3 py-1 transition-colors',
    active ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-white/10 hover:text-white',
  );

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
  const totalVotes = filtered.reduce((n, o) => n + o.votes, 0);

  const q = (patch: Record<string, string | undefined>) => {
    const next = { lang, view, group: sp.group, ...patch };
    const s = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `?${s.toString()}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white xl:h-screen">
      <LiveRefresh sessionId={sessionId} pollMs={8_000} />
      <header className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 pt-5 pb-3">
        <div>
          <h1 className="text-4xl leading-none">
            <Logo />
          </h1>
          <p className="mt-2 text-lg font-medium text-slate-400">{session.title}</p>
          <Credit className="mt-1 text-sm text-slate-400" />
        </div>
        <dl className="flex gap-6">
          <Stat label={t(lang, 'statNotes')} value={filtered.length} />
          <Stat label={t(lang, 'statVotes')} value={totalVotes} />
        </dl>
        <div className="ml-auto flex items-center gap-4 rounded-2xl bg-white/5 py-2 pr-2 pl-5 ring-1 ring-white/10">
          <div className="text-right">
            <div className="text-xl font-bold">{t(lang, 'scanToJoin')}</div>
            <div className="text-sm text-slate-400">
              {lang === 'ja' ? 'スマホから意見を投稿・+1 しよう' : 'Share feedback & +1 from your phone'}
            </div>
          </div>
          <JoinQr path={`/s/${sessionId}`} size={112} showUrl={false} />
        </div>
      </header>

      {/* Operator controls stay dim so they don't compete with the notes on the projector. */}
      <nav className="flex flex-wrap items-center gap-1 px-6 pb-3 text-sm opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100">
        <Link className={cn(tab(false), 'inline-flex items-center gap-1.5')} href={`/s/${sessionId}`}>
          <StickyNote className="size-4" />
          {t(lang, 'board')}
        </Link>
        <Link className={cn(tab(false), 'inline-flex items-center gap-1.5')} href={`/s/${sessionId}/people`}>
          <Users className="size-4" />
          {t(lang, 'people')}
        </Link>
        <span className="mx-2 h-4 border-l border-white/20" />
        <Link className={tab(view === 'notes')} href={q({ view: 'notes' })}>
          {t(lang, 'statNotes')}
        </Link>
        <Link className={tab(view === 'summary')} href={q({ view: 'summary' })}>
          ✨ {t(lang, 'summary')}
        </Link>
        <span className="mx-2 h-4 border-l border-white/20" />
        <Link className={tab(!sp.group)} href={q({ group: undefined })}>
          {t(lang, 'allGroups')}
        </Link>
        {groups.map((g) => (
          <Link key={g.id} className={tab(sp.group === g.id)} href={q({ group: g.id })}>
            {g.name}
          </Link>
        ))}
        <span className="mx-2 h-4 border-l border-white/20" />
        <Link className={tab(lang === 'en')} href={q({ lang: 'en' })}>
          EN
        </Link>
        <Link className={tab(lang === 'ja')} href={q({ lang: 'ja' })}>
          JA
        </Link>
        <FullscreenButton label={t(lang, 'fullscreen')} className={cn(tab(false), 'ml-1 py-1.5')} />
      </nav>

      {view === 'summary' ? (
        <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
          {summary ? (
            <div className="mx-auto max-w-5xl rounded-3xl bg-white p-10 text-2xl leading-relaxed text-slate-900 shadow-2xl">
              <Markdown text={summary} className="space-y-4" />
            </div>
          ) : (
            <p className="py-24 text-center text-3xl text-slate-500">{t(lang, 'noSummary')}</p>
          )}
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((c) => {
            const items = filtered.filter((o) => o.category === c).sort((a, b) => b.votes - a.votes);
            return (
              <section key={c} className="flex min-h-0 flex-col rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                <h2
                  className={cn(
                    'flex items-center justify-between rounded-t-2xl px-4 py-2.5 text-2xl font-bold',
                    CATEGORY_CHIP[c],
                  )}
                >
                  {categoryLabel(lang, c)}
                  <span className="rounded-full bg-black/20 px-2.5 text-lg tabular-nums">{items.length}</span>
                </h2>
                <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                  {items.length === 0 && <p className="py-8 text-center text-lg text-slate-600">—</p>}
                  {items.map((o) => {
                    const fresh = isFresh(o.createdAt);
                    return (
                      <article
                        key={o.id}
                        className={cn('rounded-xl border border-t-4 p-4 text-slate-900 shadow-md', CATEGORY_STYLE[c])}
                        style={fresh ? { animation: 'note-in 1.6s ease-out 3' } : undefined}
                      >
                        <p className="text-[clamp(1.05rem,1.15vw,1.6rem)] leading-snug font-medium whitespace-pre-wrap break-words">
                          {lang === 'ja' ? o.bodyJa : o.bodyEn}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                          <span className="rounded-full bg-white/80 px-2 py-0.5 font-medium">{o.groupName}</span>
                          {fresh && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                              NEW
                            </span>
                          )}
                          {o.votes > 0 && (
                            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-base font-bold text-white tabular-nums">
                              <ThumbsUp className="size-4" />
                              {o.votes}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-sm uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-4xl font-black tabular-nums leading-none">{value}</dd>
    </div>
  );
}
