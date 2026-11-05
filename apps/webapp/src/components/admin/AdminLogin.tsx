'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { adminLogin } from '@/app/admin/actions';

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3 rounded-2xl border bg-white p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await adminLogin(password);
          if (!res.ok) toast.error(res.error);
          else router.refresh();
        });
      }}
    >
      <h1 className="font-bold">Admin</h1>
      <input
        type="password"
        className="w-full rounded-lg border px-3 py-2"
        placeholder="Admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button disabled={pending} className="w-full rounded-lg bg-slate-900 py-2 text-white disabled:opacity-50">
        Log in
      </button>
    </form>
  );
}
