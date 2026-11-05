import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminSessionPanel } from '@/components/admin/AdminSessionPanel';
import { SessionForm } from '@/components/admin/SessionForm';
import { Markdown } from '@/components/Markdown';
import { getSession, listGroups, listOpinions, listProfiles } from '@/lib/data';
import { isAdmin } from '@/lib/identity';

export const dynamic = 'force-dynamic';

export default async function AdminSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  if (!(await isAdmin())) redirect('/admin');
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) notFound();
  const [groups, opinions, profiles] = await Promise.all([
    listGroups(sessionId),
    listOpinions(sessionId),
    listProfiles(sessionId),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
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
        groups={groups.map((g) => ({ id: g.id, name: g.name, language: g.language }))}
        opinions={opinions.map((o) => ({
          id: o.id,
          category: o.category,
          group: o.groupName,
          body: o.body,
          bodyEn: o.bodyEn,
          votes: o.votes,
        }))}
        profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
        summaryCount={session.summaryCount}
        hasSummary={!!session.summaryEn}
      />

      {session.summaryEn && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-4 text-sm">
            <Markdown text={session.summaryEn} />
          </div>
          <div className="rounded-xl border bg-white p-4 text-sm">
            <Markdown text={session.summaryJa ?? ''} />
          </div>
        </section>
      )}
    </main>
  );
}
