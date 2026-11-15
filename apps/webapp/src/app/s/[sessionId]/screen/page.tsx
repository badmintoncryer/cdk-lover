import { StickyNote, ThumbsUp, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Credit } from '@/components/Credit';
import { FullscreenButton } from '@/components/FullscreenButton';
import { JoinQr } from '@/components/JoinQr';
import { LiveRefresh } from '@/components/LiveRefresh';
import { Markdown } from '@/components/Markdown';
import { Logo } from '@/components/SiteHeader';
import { FitWall } from '@/components/board/FitWall';
import { CATEGORY_STYLE, CategoryDot } from '@/components/board/categories';
import { getSession, listOpinions, type OpinionView } from '@/lib/data';
import { CATEGORIES, categoryLabel, isLang, t, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Notes younger than this are marked new so the room notices fresh posts. */
const NEW_MS = 2 * 60_000;
const isFresh = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < NEW_MS;

const tab = (active: boolean) =>
  cn(
    'inline-flex h-8 items-center rounded-md px-3 transition-colors short:h-7 short:px-2 short:text-xs',
    active ? 'bg-white/12 text-white' : 'text-slate-400 hover:bg-white/6 hover:text-white',
  );

/**
 * Projector view for the room and the CDK team. Defaults to English.
 * Attendees also open it on their phones held sideways (`short:` variant), so the
 * header shrinks and the four categories become a swipeable row of two columns.
 */
export default async function ScreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ lang?: string; view?: string }>;
}) {
  const { sessionId } = await params;
  const sp = await searchParams;
  const session = await getSession(sessionId);
  if (!session) notFound();
  const lang = isLang(sp.lang) ? sp.lang : 'en';
  const view = sp.view === 'summary' ? 'summary' : 'notes';
  const opinions = await listOpinions(sessionId);
  const summary = lang === 'ja' ? session.summaryJa : session.summaryEn;
  const totalVotes = opinions.reduce((n, o) => n + o.votes, 0);

  const q = (patch: Record<string, string | undefined>) => {
    const next = { lang, view, ...patch };
    const s = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `?${s.toString()}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1013] text-slate-100 xl:h-screen short:h-dvh short:min-h-0">
      <LiveRefresh sessionId={sessionId} pollMs={8_000} />
      {/* Sideways phones get one short row for header and controls so the notes keep the height. */}
      <div className="contents short:flex short:items-center short:gap-3 short:px-3 short:py-1.5">
        <header className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 pt-5 pb-3 short:shrink-0 short:flex-nowrap short:gap-x-3 short:p-0">
          <div className="short:flex short:items-baseline short:gap-2">
            <h1 className="text-4xl leading-none short:text-base">
              <Logo />
            </h1>
            <p className="mt-2 text-lg text-slate-400 short:mt-0 short:max-w-[10rem] short:truncate short:text-xs">
              {session.title}
            </p>
            <Credit className="mt-1 text-sm text-slate-500 short:hidden" />
          </div>
          <dl className="flex gap-6 short:gap-3">
            <Stat label={t(lang, 'statNotes')} value={opinions.length} />
            <Stat label={t(lang, 'statVotes')} value={totalVotes} />
          </dl>
          {/* Phones in hand have already joined, so the QR only takes room there (laptop windows keep it). */}
          <div className="ml-auto flex items-center gap-4 rounded-2xl bg-white/[0.04] py-2 pr-2 pl-5 ring-1 ring-white/8 max-md:hidden short:hidden">
            <div className="text-right">
              <div className="text-xl font-medium">{t(lang, 'scanToJoin')}</div>
              <div className="text-sm text-slate-400">
                {lang === 'ja' ? 'スマホから意見を投稿・+1 しよう' : 'Share feedback & +1 from your phone'}
              </div>
            </div>
            <JoinQr path={`/s/${sessionId}`} size={112} showUrl={false} />
          </div>
        </header>

        <p className="mx-6 mb-3 rounded-lg bg-white/[0.05] px-3 py-2 text-sm text-slate-300 md:hidden landscape:hidden">
          {t(lang, 'rotateHint')}
        </p>

        {/* Operator controls stay dim so they don't compete with the notes on the projector. */}
        <nav className="flex flex-wrap items-center gap-1 px-6 pb-3 text-sm opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100 short:no-scrollbar short:min-w-0 short:flex-1 short:flex-nowrap short:overflow-x-auto short:p-0 short:opacity-100 short:[&>*]:shrink-0">
          <Link className={cn(tab(false), 'inline-flex items-center gap-1.5')} href={`/s/${sessionId}`}>
            <StickyNote className="size-4" />
            {t(lang, 'board')}
          </Link>
          <Link className={cn(tab(false), 'inline-flex items-center gap-1.5')} href={`/s/${sessionId}/people`}>
            <Users className="size-4" />
            {t(lang, 'people')}
          </Link>
          <span className="mx-2 h-4 border-l border-white/15" />
          <Link className={tab(view === 'notes')} href={q({ view: 'notes' })}>
            {t(lang, 'statNotes')}
          </Link>
          <Link className={tab(view === 'summary')} href={q({ view: 'summary' })}>
            {t(lang, 'summary')}
          </Link>
          <span className="mx-2 h-4 border-l border-white/15" />
          <Link className={tab(lang === 'en')} href={q({ lang: 'en' })}>
            EN
          </Link>
          <Link className={tab(lang === 'ja')} href={q({ lang: 'ja' })}>
            JA
          </Link>
          <FullscreenButton label={t(lang, 'fullscreen')} className={cn(tab(false), 'ml-1 py-1.5')} />
        </nav>
      </div>

      {view === 'summary' ? (
        <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 short:px-4 short:pb-4">
          {summary ? (
            <div className="mx-auto max-w-5xl rounded-2xl bg-white p-10 text-2xl leading-relaxed text-slate-900 short:p-5 short:text-base">
              <Markdown text={summary} className="space-y-4" />
            </div>
          ) : (
            <p className="py-24 text-center text-3xl text-slate-500">{t(lang, 'noSummary')}</p>
          )}
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col px-6 pb-4 short:px-3 short:pb-2">
          <FitWall className="min-h-0 flex-1">
            {CATEGORIES.map((c) => {
              const items = opinions.filter((o) => o.category === c).sort((a, b) => b.votes - a.votes);
              const [first, ...rest] = items.map((o) => <Note key={o.id} o={o} lang={lang} />);
              return (
                <section key={c} className="contents">
                  {/* The heading travels with its first note so it never ends a column alone. */}
                  <div className="break-inside-avoid">
                    <h2 className="flex items-center gap-[0.4em] pt-[0.1em] pb-[0.4em] text-[0.85em] leading-tight font-medium text-slate-300">
                      <CategoryDot category={c} className="size-[0.6em]" />
                      {categoryLabel(lang, c)}
                      <span className="font-mono text-slate-500 tabular-nums">{items.length}</span>
                    </h2>
                    {first ?? <p className="mb-[0.6em] text-[0.8em] text-slate-600">—</p>}
                  </div>
                  {rest}
                </section>
              );
            })}
          </FitWall>
        </main>
      )}
    </div>
  );
}

function Note({ o, lang }: { o: OpinionView; lang: Lang }) {
  const fresh = isFresh(o.createdAt);
  return (
    <article
      className={cn(
        'mb-[0.5em] break-inside-avoid rounded-[0.45em] border border-t-[0.2em] px-[0.6em] py-[0.4em] text-slate-900',
        CATEGORY_STYLE[o.category],
      )}
      style={fresh ? { animation: 'note-in 400ms cubic-bezier(0.22, 1, 0.36, 1)' } : undefined}
    >
      {/* Votes float into the first line instead of costing each note a footer row. */}
      {o.votes > 0 && (
        <span className="float-right ml-[0.5em] inline-flex items-center gap-[0.2em] font-medium text-slate-700 tabular-nums">
          <ThumbsUp className="size-[0.8em] text-slate-500" />
          {o.votes}
        </span>
      )}
      <p className="leading-snug whitespace-pre-wrap break-words">
        {fresh && (
          <span className="mr-[0.4em] align-[0.1em] text-[0.65em] font-semibold text-brand-ink uppercase">
            {t(lang, 'fresh')}
          </span>
        )}
        {lang === 'ja' ? o.bodyJa : o.bodyEn}
      </p>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse short:flex-row-reverse short:items-baseline short:gap-1">
      <dt className="mt-1 text-sm text-slate-400 short:mt-0 short:text-xs">{label}</dt>
      <dd className="text-4xl font-medium tabular-nums leading-none short:text-sm">{value}</dd>
    </div>
  );
}
