'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { adminLogin } from '@/app/admin/actions';
import { Logo } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await adminLogin(password);
          if (!res.ok) toast.error(res.error);
          else router.refresh();
        });
      }}
    >
      <h1 className="text-center text-2xl">
        <Logo />
        <span className="mt-1 block text-sm font-medium text-muted-foreground">Admin</span>
      </h1>
      <Input
        type="password"
        placeholder="Admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" variant="dark" disabled={pending} className="w-full">
        Log in
      </Button>
    </form>
  );
}
