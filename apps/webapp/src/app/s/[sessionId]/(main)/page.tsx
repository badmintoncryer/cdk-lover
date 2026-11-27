import { Lock } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Board } from '@/components/board/Board';
import { JoinPanel } from '@/components/board/JoinPanel';
import { McpPanel } from '@/components/board/McpPanel';
import { OnboardingSteps } from '@/components/OnboardingSteps';
import { getSession, listOpinions } from '@/lib/data';
import { getLang, keyFor } from '@/lib/identity';
import { t } from '@/lib/i18n';
import { getOnboarding } from '@/lib/onboarding';

export default async function BoardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) notFound();
  const [lang, onboarding, authorKey, voterKey] = await Promise.all([
    getLang(),
    getOnboarding(session),
    keyFor('opinion'),
    keyFor('vote'),
  ]);
  const opinions = await listOpinions(sessionId, { authorKey, voterKey });
  const open = session.status === 'open';
  const { joined } = onboarding;

  return (
    <div className="space-y-5">
      {!open && (
        <p className="flex items-center gap-2 rounded-xl border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          <Lock className="size-4 shrink-0" />
          {t(lang, 'closed')}
        </p>
      )}
      {open && <OnboardingSteps lang={lang} sessionId={sessionId} state={onboarding} page="board" />}
      {open && !joined && <JoinPanel lang={lang} sessionId={sessionId} hasProfile={onboarding.hasProfile} />}
      <Board
        lang={lang}
        sessionId={sessionId}
        canPost={open && joined}
        canVote={open}
        opinions={opinions}
        firstLove={open && joined && !onboarding.hasLove}
      />
      {open && joined && <McpPanel lang={lang} sessionId={sessionId} />}
    </div>
  );
}
