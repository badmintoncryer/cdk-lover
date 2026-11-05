'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { deleteProfile, saveProfile } from '@/app/actions';
import type { ProfileView } from '@/lib/data';
import { t, type Lang } from '@/lib/i18n';

export function ProfileForm({ lang, sessionId, profile }: { lang: Lang; sessionId: string; profile?: ProfileView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
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
        toast.error(res.error === 'invalid url' ? 'URL / handle?' : t(lang, 'error'));
        return;
      }
      toast.success('✓');
      router.refresh();
    });
  };

  const field = (k: keyof typeof form, label: string, placeholder?: string, max = 300) => (
    <label className="block text-sm space-y-1">
      <span className="font-medium">{label}</span>
      <input
        className="w-full rounded-lg border px-3 py-2"
        value={form[k]}
        onChange={set(k)}
        placeholder={placeholder}
        maxLength={max}
        required={k === 'name'}
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
      <h2 className="font-bold">{t(lang, 'profileTitle')}</h2>
      <p className="text-xs text-slate-500">{t(lang, 'profileHint')}</p>
      {field('name', t(lang, 'name'), undefined, 60)}
      {field('intro', t(lang, 'intro'), undefined, 160)}
      {field('linkedin', 'LinkedIn', 'https://www.linkedin.com/in/...')}
      {field('x', 'X', '@handle')}
      {field('github', 'GitHub', 'username')}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t(lang, 'save')}
        </button>
        {profile && (
          <button
            type="button"
            disabled={pending}
            className="rounded-lg border px-4 py-2 text-sm text-rose-600"
            onClick={() =>
              confirm(t(lang, 'confirmDelete')) &&
              start(async () => {
                await deleteProfile(sessionId);
                setForm({ name: '', intro: '', linkedin: '', x: '', github: '' });
                router.refresh();
              })
            }
          >
            {t(lang, 'delete')}
          </button>
        )}
      </div>
    </form>
  );
}
