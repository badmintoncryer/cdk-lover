'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { joinSession } from '@/app/actions';
import type { GroupRow } from '@/lib/data';
import { t, type Lang } from '@/lib/i18n';

export function JoinPanel({ lang, sessionId, groups }: { lang: Lang; sessionId: string; groups: GroupRow[] }) {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await joinSession({ sessionId, passphrase, groupId });
      if (!res.ok) {
        toast.error(res.error === 'wrong passphrase' ? t(lang, 'wrongPassphrase') : t(lang, 'error'));
        return;
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border-2 border-orange-300 bg-white p-5 space-y-4 shadow-sm">
      <div>
        <h2 className="font-bold">{t(lang, 'joinTitle')}</h2>
        <p className="text-sm text-slate-500">{t(lang, 'joinHint')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
        <label className="text-sm space-y-1">
          <span className="font-medium">{t(lang, 'passphrase')}</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label className="text-sm space-y-1">
          <span className="font-medium">{t(lang, 'yourGroup')}</span>
          <select
            className="w-full rounded-lg border px-3 py-2 bg-white"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.language === 'ja' ? '日本語' : 'English'})
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={pending || !groupId}
          className="rounded-lg bg-orange-500 px-5 py-2 font-semibold text-white disabled:opacity-50"
        >
          {t(lang, 'join')}
        </button>
      </div>
    </form>
  );
}
