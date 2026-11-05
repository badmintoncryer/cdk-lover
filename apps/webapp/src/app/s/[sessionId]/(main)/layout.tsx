import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LiveRefresh } from '@/components/LiveRefresh';
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
  const link = 'px-3 py-1 rounded-full hover:bg-white/10';
  return (
    <>
      <SiteHeader lang={lang} title={session.title}>
        <Link className={link} href={`/s/${sessionId}`}>
          {t(lang, 'board')}
        </Link>
        <Link className={link} href={`/s/${sessionId}/people`}>
          {t(lang, 'people')}
        </Link>
        <Link className={link} href={`/s/${sessionId}/screen`} target="_blank">
          {t(lang, 'screen')} ↗
        </Link>
      </SiteHeader>
      <LiveRefresh sessionId={sessionId} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
