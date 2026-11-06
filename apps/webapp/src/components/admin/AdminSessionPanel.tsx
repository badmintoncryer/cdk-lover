'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  addGroup,
  adminDeleteOpinion,
  adminDeleteProfile,
  clearSummary,
  deleteGroup,
  deleteSessionData,
  runSummary,
  type AdminResult,
} from '@/app/admin/actions';

type Props = {
  sessionId: string;
  groups: { id: string; name: string; language: string }[];
  opinions: { id: string; category: string; group: string; body: string; bodyEn: string; votes: number }[];
  profiles: { id: string; name: string }[];
  summaryCount: number;
  hasSummary: boolean;
};

export function AdminSessionPanel({ sessionId, groups, opinions, profiles, summaryCount, hasSummary }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [groupName, setGroupName] = useState('');
  const [groupLang, setGroupLang] = useState('ja');
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
      <section className={card}>
        <h2 className="font-bold">Groups</h2>
        <ul className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-sm">
              {g.name} <span className="text-slate-400">{g.language}</span>
              <button
                disabled={pending}
                className="text-rose-600"
                onClick={() => confirm(`Delete group ${g.name}?`) && run(() => deleteGroup(sessionId, g.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await addGroup(sessionId, groupName, groupLang);
              if (r.ok) setGroupName('');
              return r;
            }, 'Group added');
          }}
        >
          <input
            className="h-9 rounded-lg border bg-card px-3 text-sm"
            placeholder="JP-1"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
          <select
            className="h-9 rounded-lg border bg-card px-2 text-sm"
            value={groupLang}
            onChange={(e) => setGroupLang(e.target.value)}
          >
            <option value="ja">ja</option>
            <option value="en">en</option>
          </select>
          <button disabled={pending} className={`${btn} bg-slate-900 text-white hover:bg-slate-800`}>
            Add group
          </button>
        </form>
      </section>

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
              <span className="w-16 shrink-0 text-xs text-slate-500">{o.group}</span>
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
