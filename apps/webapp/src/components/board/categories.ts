/** Sticky-note colours per category; a coloured top edge keeps them apart for colour-blind readers too. */
export const CATEGORY_STYLE: Record<string, string> = {
  good: 'bg-emerald-50 border-emerald-200 border-t-emerald-500',
  bad: 'bg-rose-50 border-rose-200 border-t-rose-500',
  wish: 'bg-amber-50 border-amber-200 border-t-amber-400',
  other: 'bg-sky-50 border-sky-200 border-t-sky-500',
};

export const CATEGORY_CHIP: Record<string, string> = {
  good: 'bg-emerald-600',
  bad: 'bg-rose-600',
  wish: 'bg-amber-500',
  other: 'bg-sky-600',
};

/** Selected-state chip (ring + tint) used by the composer and the filter bar. */
export const CATEGORY_SELECTED: Record<string, string> = {
  good: 'bg-emerald-600 text-white border-emerald-600',
  bad: 'bg-rose-600 text-white border-rose-600',
  wish: 'bg-amber-500 text-white border-amber-500',
  other: 'bg-sky-600 text-white border-sky-600',
};
