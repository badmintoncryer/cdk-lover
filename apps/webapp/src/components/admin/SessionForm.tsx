'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { upsertSession } from '@/app/admin/actions';

type Initial = { id: string; title: string; status: 'open' | 'closed' };

export function SessionForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    id: initial?.id ?? '',
    title: initial?.title ?? '',
    passphrase: '',
    status: initial?.status ?? ('open' as 'open' | 'closed'),
  });
  return (
    <form
      className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await upsertSession(form);
          if (!res.ok) return void toast.error(res.error);
          toast.success('Saved');
          setForm((f) => ({ ...f, passphrase: '' }));
          if (initial) router.refresh();
          else router.push(`/admin/${form.id}`);
        });
      }}
    >
      <label className="text-sm space-y-1">
        <span>ID (URL: /s/&lt;id&gt;)</span>
        <input
          className="w-full rounded border px-2 py-1 disabled:bg-slate-100"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          placeholder="1130"
          disabled={!!initial}
          required
        />
      </label>
      <label className="text-sm space-y-1">
        <span>Title</span>
        <input
          className="w-full rounded border px-2 py-1"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="re:Invent 2026 · Nov 30"
          required
        />
      </label>
      <label className="text-sm space-y-1">
        <span>Passphrase {initial && '(leave empty to keep; changing it signs everyone out)'}</span>
        <input
          className="w-full rounded border px-2 py-1"
          value={form.passphrase}
          onChange={(e) => setForm({ ...form, passphrase: e.target.value })}
          required={!initial}
          autoComplete="off"
        />
      </label>
      <label className="text-sm space-y-1">
        <span>Status</span>
        <select
          className="w-full rounded border px-2 py-1 bg-white"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as 'open' | 'closed' })}
        >
          <option value="open">open (accepts posts)</option>
          <option value="closed">closed (read-only)</option>
        </select>
      </label>
      <button
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50 sm:col-span-2"
      >
        {initial ? 'Save' : 'Create session'}
      </button>
    </form>
  );
}
