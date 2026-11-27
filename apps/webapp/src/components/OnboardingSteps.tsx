'use client';

import { ArrowRight, Check, PartyPopper, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { t, type Lang } from '@/lib/i18n';
import type { Onboarding } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

const dismissKey = (sessionId: string) => `cl_onb_done_${sessionId}`;

function readDismissed(sessionId: string): boolean {
  try {
    return localStorage.getItem(dismissKey(sessionId)) === '1';
  } catch {
    return false;
  }
}

// Only this tab writes the flag, and it also flips local state, so there is nothing to subscribe to.
const subscribe = () => () => {};

/**
 * First-visit guide shown above the board and the people page. The forms redirect to the next step
 * on their own; this card tells people where they are and lets them pick up after a reload.
 */
export function OnboardingSteps({
  lang,
  sessionId,
  state,
  page,
}: {
  lang: Lang;
  sessionId: string;
  state: Onboarding;
  page: 'board' | 'people';
}) {
  const { joined, hasProfile, hasLove } = state;
  const done = joined && hasProfile && hasLove;
  // Server render reports "dismissed" so the done card never flashes before localStorage is read.
  const stored = useSyncExternalStore(
    subscribe,
    () => readDismissed(sessionId),
    () => true,
  );
  const [dismissedNow, setDismissedNow] = useState(false);
  const dismissed = stored || dismissedNow;

  if (done) {
    if (dismissed) return null;
    const dismiss = () => {
      setDismissedNow(true);
      try {
        localStorage.setItem(dismissKey(sessionId), '1');
      } catch {}
    };
    return (
      <Card className="flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <PartyPopper className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t(lang, 'onbDoneTitle')}</p>
          <p className="mt-0.5 text-sm text-emerald-900/80">{t(lang, 'onbDoneHint')}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t(lang, 'onbDismiss')}
          className="-m-1 grid size-8 shrink-0 place-items-center rounded-md text-emerald-700 hover:bg-emerald-100"
        >
          <X className="size-4" />
        </button>
      </Card>
    );
  }

  const steps = [
    { label: t(lang, 'onbJoin'), done: joined },
    { label: t(lang, 'onbProfile'), done: hasProfile },
    { label: t(lang, 'onbLove'), done: hasLove },
  ];
  const current = steps.findIndex((s) => !s.done);
  const base = `/s/${sessionId}`;
  const next =
    current === 0
      ? { hint: t(lang, 'onbJoinHint'), cta: page === 'people' ? { href: base, label: t(lang, 'onbJoin') } : undefined }
      : current === 1
        ? {
            hint: t(lang, 'onbProfileHint'),
            cta: page === 'board' ? { href: `${base}/people`, label: t(lang, 'onbGoProfile') } : undefined,
          }
        : {
            hint: t(lang, 'onbLoveHint'),
            cta: { href: page === 'board' ? '#composer' : `${base}#composer`, label: t(lang, 'onbGoLove') },
          };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold leading-tight">{t(lang, 'onbTitle')}</h2>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {t(lang, 'onbStep')} {current + 1}/{steps.length}
        </span>
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-2">
        {steps.map((s, i) => (
          <li
            key={s.label}
            aria-current={i === current ? 'step' : undefined}
            className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2"
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium tabular-nums',
                s.done && 'border-emerald-500 bg-emerald-500 text-white',
                i === current && 'border-slate-900 bg-slate-900 text-white',
                !s.done && i !== current && 'bg-card text-muted-foreground',
              )}
            >
              {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                'text-xs leading-snug sm:text-sm',
                i === current ? 'font-medium text-foreground' : 'text-muted-foreground',
                s.done && 'line-through decoration-muted-foreground/50',
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">{next.hint}</p>
        {next.cta && (
          <Button asChild variant="dark" className="w-full sm:w-auto">
            <Link href={next.cta.href}>
              {next.cta.label}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
