'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  adminDeleteOpinion,
  adminDeleteProfile,
  clearSummary,
  deleteSessionData,
  runSummary,
  setPhase,
  stepPhase,
  type AdminResult,
} from '@/app/admin/actions';
import { formatLeft, useNowSeconds } from '@/components/phase/PhaseBanner';
import { PHASE_INFO, PHASES, type PhaseState } from '@/lib/phases';
import { cn } from '@/lib/utils';

type Props = {
  sessionId: string;
  opinions: { id: string; category: string; body: string; bodyEn: string; votes: number }[];
  profiles: { id: string; name: string }[];
  summaryCount: number;
  hasSummary: boolean;
  phase: PhaseState;
};

export function AdminSessionPanel({ sessionId, opinions, profiles, summaryCount, hasSummary, phase }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmId, setConfirmId] = useState('');

  const run = (fn: () => Promise<AdminResult | void>, ok = 'Done') =>
    start(async () => {
      const res = await fn();
      if (res && !res.ok) toast.error(res.error);
      else toast.success(ok);
      router.refresh();
    });

  const btn = 'inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition disabled:opacity-50';
  const card = 'space-y-3 rounded-2xl border bg-card p-5 shadow-sm';

  return (
    <div className="space-y-5">
      <PhaseControl sessionId={sessionId} stored={phase} pending={pending} run={run} btn={btn} card={card} />

      <section className={card}>
        <h2 className="font-bold">AI summary & report</h2>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={pending}
            className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}
            onClick={() => run(() => runSummary(sessionId), 'Summary updated')}
          >
            {pending ? 'Working…' : 'Generate summary'}
          </button>
          {hasSummary && (
            <button
              disabled={pending}
              className={`${btn} border bg-card hover:bg-accent`}
              onClick={() => run(() => clearSummary(sessionId))}
            >
              Clear summary
            </button>
          )}
          <a className={`${btn} border bg-card hover:bg-accent`} href={`/api/admin/export/${sessionId}?format=md`}>
            Download report (.md)
          </a>
          <a className={`${btn} border bg-card hover:bg-accent`} href={`/api/admin/export/${sessionId}?format=csv`}>
            Download notes (.csv)
          </a>
        </div>
        <p className="text-xs text-slate-500">Summaries used: {summaryCount} / 20</p>
      </section>

      <section className={card}>
        <h2 className="font-bold">Notes ({opinions.length})</h2>
        <ul className="max-h-[480px] divide-y overflow-y-auto rounded-xl border text-sm">
          {opinions.map((o) => (
            <li key={o.id} className="flex items-start gap-3 px-3 py-2">
              <span className="w-12 shrink-0 text-xs text-slate-500">{o.category}</span>
              <span className="flex-1 break-words">
                {o.body}
                {o.bodyEn !== o.body && <span className="block text-xs text-slate-500">{o.bodyEn}</span>}
              </span>
              <span className="text-xs">+{o.votes}</span>
              <button
                disabled={pending}
                className="text-xs text-rose-600"
                onClick={() => confirm('Delete this note?') && run(() => adminDeleteOpinion(sessionId, o.id))}
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className="font-bold">Profiles ({profiles.length})</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-full border bg-secondary px-3 py-1">
              {p.name}
              <button
                disabled={pending}
                className="text-rose-600"
                onClick={() => confirm('Delete this profile?') && run(() => adminDeleteProfile(sessionId, p.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-rose-300 bg-rose-50 p-5">
        <h2 className="font-semibold text-rose-700">Delete all data of this session</h2>
        <p className="text-sm">Removes notes, votes, groups, profiles and the session itself. This cannot be undone.</p>
        <div className="flex gap-2">
          <input
            className="h-9 rounded-lg border bg-card px-3 text-sm"
            placeholder={`type "${sessionId}"`}
            value={confirmId}
            onChange={(e) => setConfirmId(e.target.value)}
          />
          <button
            disabled={pending || confirmId !== sessionId}
            className={`${btn} bg-rose-600 text-white`}
            onClick={() => run(() => deleteSessionData(sessionId, confirmId), 'Deleted')}
          >
            Delete everything
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * The organizer runs the meetup: Next when the room is ready, Back to undo, Stop to hide the
 * banner. Nothing moves on its own; the planned minutes only show as time left (or overtime).
 */
function PhaseControl({
  sessionId,
  stored,
  pending,
  run,
  btn,
  card,
}: {
  sessionId: string;
  stored: PhaseState;
  pending: boolean;
  run: (fn: () => Promise<AdminResult | void>, ok?: string) => void;
  btn: string;
  card: string;
}) {
  const now = useNowSeconds();
  const index = stored ? PHASES.indexOf(stored.phase) : -1;
  const next = PHASES[index + 1];
  const end = stored?.endsAt ? Math.floor(new Date(stored.endsAt).getTime() / 1000) : null;
  const diff = end !== null && now !== null ? end - now : null;
  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-bold">Agenda banner</h2>
        <p className="text-xs text-slate-500">
          Shows the current part on every board. It never moves on by itself: press Next when the room is ready. The
          minutes are only a guide.
        </p>
      </div>
      <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {PHASES.map((p, i) => (
          <li key={p} className={cn(i === index ? 'font-bold' : i < index ? 'text-slate-400' : 'text-slate-600')}>
            {i + 1}. {PHASE_INFO[p].name.en}
            {i === index && diff !== null && (
              <span
                className={cn(
                  'ml-1.5 font-mono font-normal tabular-nums',
                  diff < 0 ? 'text-amber-600' : 'text-slate-500',
                )}
              >
                {diff >= 0 ? `${formatLeft(diff)} left` : `+${formatLeft(-diff)} over`}
              </span>
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending || index <= 0}
          className={`${btn} border bg-card hover:bg-accent`}
          onClick={() => run(() => stepPhase(sessionId, -1), 'Back')}
        >
          ← Back
        </button>
        <button
          disabled={pending || !next}
          className={`${btn} h-11 bg-primary px-5 text-base text-primary-foreground hover:bg-primary/90`}
          onClick={() => run(() => stepPhase(sessionId, 1), next ? PHASE_INFO[next].name.en : 'Done')}
        >
          {next ? `${index < 0 ? 'Start' : 'Next'}: ${PHASE_INFO[next].name.en} →` : 'Last part'}
        </button>
        {stored && (
          <button
            disabled={pending}
            className={`${btn} border bg-card hover:bg-accent`}
            onClick={() => run(() => setPhase(sessionId, null), 'Banner hidden')}
          >
            Stop
          </button>
        )}
      </div>
    </section>
  );
}
