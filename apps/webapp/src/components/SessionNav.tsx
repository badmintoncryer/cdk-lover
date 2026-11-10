'use client';

import { ArrowUpRight, Presentation, StickyNote, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Labels = { board: string; people: string; screen: string };

const item = (active: boolean) =>
  cn(
    'flex h-8 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors md:flex-none',
    active ? 'bg-white/12 text-white' : 'text-slate-400 hover:bg-white/6 hover:text-white',
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
      {/* Without a projector, attendees open the screen view on their own phones too. */}
      <Link href={`${base}/screen`} target="_blank" className={item(false)}>
        <Presentation className="size-4" />
        {labels.screen}
        <ArrowUpRight className="-ml-1 size-3.5 opacity-60" aria-hidden />
      </Link>
    </nav>
  );
}
