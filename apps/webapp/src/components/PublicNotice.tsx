import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shown next to every form whose content becomes visible to the room and the CDK team. */
export function PublicNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900',
        className,
      )}
    >
      <Globe className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
