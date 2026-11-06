import { Github, Heart } from 'lucide-react';
import { ORGANIZER } from '@/lib/organizer';
import { cn } from '@/lib/utils';

export function Credit({ className }: { className?: string }) {
  return (
    <a
      href={ORGANIZER.githubUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-1.5 transition-colors hover:text-brand', className)}
    >
      <Github className="size-3.5" />
      <span>
        Made with{' '}
        <Heart aria-hidden className="inline size-3 -translate-y-px fill-current text-brand" strokeWidth={0} />
        <span className="sr-only">love</span> by <span className="font-medium">{ORGANIZER.name}</span>
      </span>
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t py-6 text-center text-xs text-muted-foreground">
      <Credit />
    </footer>
  );
}
