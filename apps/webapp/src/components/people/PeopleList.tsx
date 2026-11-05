'use client';

import { Github, Linkedin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import type { ProfileView } from '@/lib/data';
import { t, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  'bg-orange-100 text-orange-800',
  'bg-violet-100 text-violet-800',
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-rose-100 text-rose-800',
  'bg-amber-100 text-amber-800',
];

function initials(name: string) {
  // CJK names read better as a single character than as surname + given-name initials.
  if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(name)) return [...name.trim()][0];
  const parts = name.trim().split(/\s+/);
  const chars =
    parts.length > 1 ? [parts[0], parts[parts.length - 1]].map((p) => [...p][0]) : [...parts[0]].slice(0, 2);
  return chars.join('').toUpperCase();
}

function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)!) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function handleOf(url: string) {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean);
    return seg[seg[0] === 'in' ? 1 : 0];
  } catch {
    return undefined;
  }
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  children,
  className,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white transition hover:opacity-90',
        className,
      )}
    >
      {children}
    </a>
  );
}

export function PeopleList({ lang, people }: { lang: Lang; people: ProfileView[] }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? people.filter((p) => `${p.name} ${p.intro}`.toLowerCase().includes(needle)) : people;
    // Your own card first so you can check how others see it.
    return [...list].sort((a, b) => Number(b.mine) - Number(a.mine));
  }, [people, q]);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-bold">
          {t(lang, 'people')} <span className="text-muted-foreground tabular-nums">({people.length})</span>
        </h2>
        {people.length > 6 && (
          <div className="relative ml-auto w-full max-w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(lang, 'searchPeople')}
              className="h-9 pl-9 md:h-9"
            />
          </div>
        )}
      </div>
      {people.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center text-muted-foreground">
          <div className="text-4xl" aria-hidden>
            👥
          </div>
          <p className="mt-3">{t(lang, 'noProfiles')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((p) => (
            <li
              key={p.id}
              className={cn(
                'flex gap-3 rounded-2xl border bg-card p-4 shadow-sm',
                p.mine && 'border-primary/50 ring-1 ring-primary/20',
              )}
            >
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold',
                  colorFor(p.name),
                )}
                aria-hidden
              >
                {initials(p.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{p.name}</span>
                  {p.mine && (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">
                      {t(lang, 'me')}
                    </span>
                  )}
                </div>
                {p.intro && <p className="mt-0.5 break-words text-sm text-muted-foreground">{p.intro}</p>}
                {(p.linkedinUrl || p.xUrl || p.githubUrl) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.linkedinUrl && (
                      <SocialLink href={p.linkedinUrl} label="LinkedIn" className="bg-[#0a66c2]">
                        <Linkedin className="size-3.5" />
                        LinkedIn
                      </SocialLink>
                    )}
                    {p.xUrl && (
                      <SocialLink href={p.xUrl} label="X" className="bg-black">
                        <XIcon className="size-3.5" />
                        {handleOf(p.xUrl) ? `@${handleOf(p.xUrl)}` : 'X'}
                      </SocialLink>
                    )}
                    {p.githubUrl && (
                      <SocialLink href={p.githubUrl} label="GitHub" className="bg-slate-800">
                        <Github className="size-3.5" />
                        {handleOf(p.githubUrl) ?? 'GitHub'}
                      </SocialLink>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
