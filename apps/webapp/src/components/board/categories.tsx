import { cn } from '@/lib/utils';

/**
 * Sticky-note colours per category. The notes are the one place on the page that carries colour;
 * the coloured top edge and the dot keep categories apart for colour-blind readers too.
 */
export const CATEGORY_STYLE: Record<string, string> = {
  good: 'bg-emerald-50 border-emerald-200/80 border-t-emerald-500',
  bad: 'bg-rose-50 border-rose-200/80 border-t-rose-500',
  wish: 'bg-amber-50 border-amber-200/80 border-t-amber-400',
  other: 'bg-sky-50 border-sky-200/80 border-t-sky-500',
};

export const CATEGORY_DOT: Record<string, string> = {
  good: 'bg-emerald-500',
  bad: 'bg-rose-500',
  wish: 'bg-amber-400',
  other: 'bg-sky-500',
};

/** Selected state of a category control: the note's own tint, so picking one previews the note. */
export const CATEGORY_SELECTED: Record<string, string> = {
  good: 'bg-emerald-50 text-emerald-950 border-emerald-500',
  bad: 'bg-rose-50 text-rose-950 border-rose-500',
  wish: 'bg-amber-50 text-amber-950 border-amber-400',
  other: 'bg-sky-50 text-sky-950 border-sky-500',
};

export function CategoryDot({ category, className }: { category: string; className?: string }) {
  return (
    <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', CATEGORY_DOT[category], className)} />
  );
}
