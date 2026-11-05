'use client';

import { Presentation, StickyNote, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Labels = { board: string; people: string; screen: string };

const item = (active: boolean) =>
  cn(
    'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors md:flex-none',
    active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10 hover:text-white',
  );

export function SessionNav({ sessionId, labels }: { sessionId: string; labels: Labels }) {
  const pathname = usePathname();
  const base = `/s/${sessionId}`;
  const items = [
    { href: base, label: labels.board, icon: StickyNote, active: pathname === base },
    { href: `${base}/people`, label: labels.people, icon: Users, active: pathname.startsWith(`${base}/people`) },
  ];
  return (
    <nav className="flex items-center gap-1">
      {items.map(({ href, label, icon: Icon, active }) => (
        <Link key={href} href={href} className={item(active)} aria-current={active ? 'page' : undefined}>
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
      {/* The projector view is for the presenter's laptop, not phones. */}
      <Link href={`${base}/screen`} target="_blank" className={cn(item(false), 'hidden md:flex')}>
        <Presentation className="size-4" />
        {labels.screen} ↗
      </Link>
    </nav>
  );
}
