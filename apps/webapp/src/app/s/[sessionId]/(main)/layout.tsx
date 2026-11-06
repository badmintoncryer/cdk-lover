import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/Credit';
import { LiveRefresh } from '@/components/LiveRefresh';
import { SessionNav } from '@/components/SessionNav';
import { SiteHeader } from '@/components/SiteHeader';
import { getSession } from '@/lib/data';
import { getLang } from '@/lib/identity';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const [lang, session] = await Promise.all([getLang(), getSession(sessionId)]);
  if (!session) notFound();
  return (
    <>
      <SiteHeader lang={lang} title={session.title}>
        <SessionNav
          sessionId={sessionId}
          labels={{ board: t(lang, 'board'), people: t(lang, 'people'), screen: t(lang, 'screen') }}
        />
      </SiteHeader>
      <LiveRefresh sessionId={sessionId} />
      <main className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:pt-6">{children}</main>
      <SiteFooter />
    </>
  );
}
