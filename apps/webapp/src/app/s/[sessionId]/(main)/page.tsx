import { Lock } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Board } from '@/components/board/Board';
import { JoinPanel } from '@/components/board/JoinPanel';
import { getSession, listGroups, listOpinions } from '@/lib/data';
import { getGroupId, getLang, isJoined, keyFor } from '@/lib/identity';
import { t } from '@/lib/i18n';

export default async function BoardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) notFound();
  const [lang, joined, groups, myGroupId, authorKey, voterKey] = await Promise.all([
    getLang(),
    isJoined(sessionId, session.passphraseHash),
    listGroups(sessionId),
    getGroupId(sessionId),
    keyFor('opinion'),
    keyFor('vote'),
  ]);
  const opinions = await listOpinions(sessionId, { authorKey, voterKey });
  const open = session.status === 'open';
  const myGroup = groups.find((g) => g.id === myGroupId);

  return (
    <div className="space-y-5">
      {!open && (
        <p className="flex items-center gap-2 rounded-xl border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          <Lock className="size-4 shrink-0" />
          {t(lang, 'closed')}
        </p>
      )}
      {open && !joined && <JoinPanel lang={lang} sessionId={sessionId} groups={groups} />}
      <Board
        lang={lang}
        sessionId={sessionId}
        canPost={open && joined && !!myGroup}
        canVote={open && joined}
        groups={groups}
        myGroupId={myGroup?.id}
        opinions={opinions}
      />
    </div>
  );
}
