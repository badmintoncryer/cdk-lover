import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminSessionPanel } from '@/components/admin/AdminSessionPanel';
import { SessionForm } from '@/components/admin/SessionForm';
import { Markdown } from '@/components/Markdown';
import { getSession, listOpinions, listProfiles } from '@/lib/data';
import { isAdmin } from '@/lib/identity';
import { phaseState } from '@/lib/phases';

export const dynamic = 'force-dynamic';

export default async function AdminSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  if (!(await isAdmin())) redirect('/admin');
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) notFound();
  const [opinions, profiles] = await Promise.all([listOpinions(sessionId), listProfiles(sessionId)]);
  const phase = phaseState(session);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-sm underline">
          ← Sessions
        </Link>
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <Link href={`/s/${sessionId}`} className="text-sm underline" target="_blank">
          Board ↗
        </Link>
        <Link href={`/s/${sessionId}/screen`} className="text-sm underline" target="_blank">
          Screen ↗
        </Link>
      </div>

      <SessionForm
        initial={{ id: session.id, title: session.title, status: session.status === 'closed' ? 'closed' : 'open' }}
      />

      <AdminSessionPanel
        sessionId={sessionId}
        opinions={opinions.map((o) => ({
          id: o.id,
          category: o.category,
          body: o.body,
          bodyEn: o.bodyEn,
          votes: o.votes,
        }))}
        profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
        summaryCount={session.summaryCount}
        hasSummary={!!session.summaryEn}
        phase={phase?.phase ?? null}
        phaseEndsAt={phase?.endsAt ?? null}
      />

      {session.summaryEn && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 text-sm shadow-sm">
            <Markdown text={session.summaryEn} />
          </div>
          <div className="rounded-2xl border bg-card p-5 text-sm shadow-sm">
            <Markdown text={session.summaryJa ?? ''} />
          </div>
        </section>
      )}
    </main>
  );
}
