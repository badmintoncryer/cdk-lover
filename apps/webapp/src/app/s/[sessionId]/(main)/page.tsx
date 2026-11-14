import { Lock } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Board } from '@/components/board/Board';
import { JoinPanel } from '@/components/board/JoinPanel';
import { McpPanel } from '@/components/board/McpPanel';
import { PhaseBanner } from '@/components/phase/PhaseBanner';
import { getSession, listOpinions } from '@/lib/data';
import { getLang, isJoined, keyFor } from '@/lib/identity';
import { t } from '@/lib/i18n';
import { phaseState } from '@/lib/phases';

export default async function BoardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) notFound();
  const [lang, joined, authorKey, voterKey] = await Promise.all([
    getLang(),
    isJoined(sessionId, session.passphraseHash),
    keyFor('opinion'),
    keyFor('vote'),
  ]);
  const opinions = await listOpinions(sessionId, { authorKey, voterKey });
  const open = session.status === 'open';
  const phase = open ? phaseState(session) : null;

  return (
    <div className="space-y-5">
      {!open && (
        <p className="flex items-center gap-2 rounded-xl border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          <Lock className="size-4 shrink-0" />
          {t(lang, 'closed')}
        </p>
      )}
      <PhaseBanner state={phase} lang={lang} />
      {open && !joined && <JoinPanel lang={lang} sessionId={sessionId} />}
      <Board
        lang={lang}
        sessionId={sessionId}
        canPost={open && joined}
        canVote={open}
        opinions={opinions}
        phase={phase}
      />
      {open && joined && <McpPanel lang={lang} sessionId={sessionId} />}
    </div>
  );
}
