'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { upsertSession } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';

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
      className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-2"
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
      <Label>
        <span className="text-muted-foreground">ID (URL: /s/&lt;id&gt;)</span>
        <Input
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          placeholder="1130"
          disabled={!!initial}
          required
        />
      </Label>
      <Label>
        <span className="text-muted-foreground">Title</span>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="re:Invent 2026 · Nov 30"
          required
        />
      </Label>
      <Label>
        <span className="text-muted-foreground">
          Passphrase {initial && '(leave empty to keep; changing it signs everyone out)'}
        </span>
        <Input
          value={form.passphrase}
          onChange={(e) => setForm({ ...form, passphrase: e.target.value })}
          required={!initial}
          autoComplete="off"
        />
      </Label>
      <Label>
        <span className="text-muted-foreground">Status</span>
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'open' | 'closed' })}>
          <option value="open">open (accepts posts)</option>
          <option value="closed">closed (read-only)</option>
        </Select>
      </Label>
      <Button type="submit" variant="dark" disabled={pending} className="sm:col-span-2">
        {initial ? 'Save' : 'Create session'}
      </Button>
    </form>
  );
}
