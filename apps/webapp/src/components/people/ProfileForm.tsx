'use client';

import { ChevronDown, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { deleteProfile, saveProfile } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ProfileView } from '@/lib/data';
import { t, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function ProfileForm({ lang, sessionId, profile }: { lang: Lang; sessionId: string; profile?: ProfileView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Once saved, fold the form so the directory is what a phone shows first.
  const [open, setOpen] = useState(!profile);
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    intro: profile?.intro ?? '',
    linkedin: profile?.linkedinUrl ?? '',
    x: profile?.xUrl ?? '',
    github: profile?.githubUrl ?? '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveProfile({ sessionId, ...form });
      if (!res.ok) {
        toast.error(res.error === 'invalid url' ? t(lang, 'invalidUrl') : t(lang, 'error'));
        return;
      }
      toast.success(t(lang, 'saved'));
      setOpen(false);
      router.refresh();
    });
  };

  const field = (
    k: keyof typeof form,
    label: string,
    opts: { placeholder?: string; max?: number; url?: boolean; required?: boolean } = {},
  ) => (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>
        {label}
        {opts.required && <span className="text-primary"> *</span>}
      </span>
      <Input
        value={form[k]}
        onChange={set(k)}
        placeholder={opts.placeholder}
        maxLength={opts.max ?? 300}
        required={opts.required}
        autoCapitalize={opts.url ? 'off' : undefined}
        autoCorrect={opts.url ? 'off' : undefined}
        spellCheck={opts.url ? false : undefined}
        inputMode={opts.url ? 'url' : undefined}
        autoComplete={k === 'name' ? 'name' : 'off'}
      />
    </label>
  );

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{profile ? t(lang, 'editProfile') : t(lang, 'addProfile')}</span>
          {!open && profile && <span className="block truncate text-sm text-muted-foreground">{profile.name}</span>}
        </span>
        <ChevronDown className={cn('size-5 text-muted-foreground transition', open && 'rotate-180')} />
      </button>
      {open && (
        <form onSubmit={submit} className="space-y-3 border-t px-4 pt-3 pb-4">
          <p className="text-xs text-muted-foreground">{t(lang, 'profileHint')}</p>
          {field('name', t(lang, 'name'), { max: 60, required: true })}
          {field('intro', t(lang, 'intro'), { max: 160 })}
          {field('linkedin', 'LinkedIn', { placeholder: 'linkedin.com/in/…', url: true })}
          <div className="grid grid-cols-2 gap-3">
            {field('x', 'X', { placeholder: '@handle', url: true })}
            {field('github', 'GitHub', { placeholder: 'username', url: true })}
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
              {t(lang, 'save')}
            </Button>
            {profile && (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() =>
                  confirm(t(lang, 'confirmDelete')) &&
                  start(async () => {
                    await deleteProfile(sessionId);
                    setForm({ name: '', intro: '', linkedin: '', x: '', github: '' });
                    setOpen(true);
                    router.refresh();
                  })
                }
              >
                {t(lang, 'delete')}
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
