import { Github } from 'lucide-react';
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
        Made with 💜 by <span className="font-semibold">{ORGANIZER.name}</span>
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
