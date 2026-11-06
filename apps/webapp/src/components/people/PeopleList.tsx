'use client';

import { Github, Linkedin, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import type { ProfileView } from '@/lib/data';
import { t, type Lang } from '@/lib/i18n';
import { ORGANIZER } from '@/lib/organizer';
import { cn } from '@/lib/utils';

// The four sticky-note tints, so a person's initials look like they belong to the board.
const AVATAR_COLORS = [
  'bg-emerald-50 text-emerald-800',
  'bg-rose-50 text-rose-800',
  'bg-amber-50 text-amber-800',
  'bg-sky-50 text-sky-800',
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

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={label}
      title={label}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary hover:text-foreground [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
    >
      {children}
    </a>
  );
}

export function OrganizerCard({ lang }: { lang: Lang }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6">
      <div className="flex items-center gap-4 sm:gap-5">
        {/* Plain img: next/image would need remotePatterns for one avatar. */}
        {/* oxlint-disable-next-line nextjs/no-img-element */}
        <img
          src={ORGANIZER.avatarUrl}
          alt=""
          width={88}
          height={88}
          className="size-16 shrink-0 rounded-full bg-secondary sm:size-20"
        />
        <div className="min-w-0">
          <div className="text-xs font-medium text-brand-ink">{t(lang, 'organizer')}</div>
          <div className="mt-1 text-xl font-semibold sm:text-2xl">{ORGANIZER.name}</div>
          <p className="mt-0.5 text-sm text-muted-foreground">{ORGANIZER.intro[lang]}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ORGANIZER.linkedinUrl && (
              <SocialLink href={ORGANIZER.linkedinUrl} label="LinkedIn">
                <Linkedin className="size-3.5" />
                LinkedIn
              </SocialLink>
            )}
            {ORGANIZER.xUrl && (
              <SocialLink href={ORGANIZER.xUrl} label="X">
                <XIcon className="size-3.5" />
                {handleOf(ORGANIZER.xUrl) ? `@${handleOf(ORGANIZER.xUrl)}` : 'X'}
              </SocialLink>
            )}
            <SocialLink href={ORGANIZER.githubUrl} label="GitHub">
              <Github className="size-3.5" />
              {handleOf(ORGANIZER.githubUrl)}
            </SocialLink>
          </div>
        </div>
      </div>
    </div>
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
        <h2 className="font-semibold">
          {t(lang, 'people')}{' '}
          <span className="font-mono text-sm font-normal text-muted-foreground tabular-nums">{people.length}</span>
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
        <div className="rounded-xl border border-dashed bg-card/60 px-6 py-12 text-center text-muted-foreground">
          <Users className="mx-auto size-6" strokeWidth={1.5} aria-hidden />
          <p className="mt-3">{t(lang, 'noProfiles')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((p) => (
            <li
              key={p.id}
              className={cn(
                'flex gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]',
                p.mine && 'border-slate-900/30',
              )}
            >
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-full text-sm font-medium',
                  colorFor(p.name),
                )}
                aria-hidden
              >
                {initials(p.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.name}</span>
                  {p.mine && <span className="text-xs text-muted-foreground">{t(lang, 'me')}</span>}
                </div>
                {p.intro && <p className="mt-0.5 break-words text-sm text-muted-foreground">{p.intro}</p>}
                {(p.linkedinUrl || p.xUrl || p.githubUrl) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.linkedinUrl && (
                      <SocialLink href={p.linkedinUrl} label="LinkedIn">
                        <Linkedin className="size-3.5" />
                        LinkedIn
                      </SocialLink>
                    )}
                    {p.xUrl && (
                      <SocialLink href={p.xUrl} label="X">
                        <XIcon className="size-3.5" />
                        {handleOf(p.xUrl) ? `@${handleOf(p.xUrl)}` : 'X'}
                      </SocialLink>
                    )}
                    {p.githubUrl && (
                      <SocialLink href={p.githubUrl} label="GitHub">
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
