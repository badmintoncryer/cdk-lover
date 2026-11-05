import type * as React from 'react';
import { cn } from '@/lib/utils';

// 16px text on phones: iOS Safari zooms into any focused field smaller than that.
const field =
  'w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(field, 'h-11 md:h-10 py-2', className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea data-slot="textarea" className={cn(field, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />
  );
}

function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select data-slot="select" className={cn(field, 'h-11 md:h-10 py-2 pr-8', className)} {...props} />;
}

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  // Callers wrap the control inside the label, which the rule cannot see through props.
  // oxlint-disable-next-line jsx-a11y/label-has-associated-control
  return <label data-slot="label" className={cn('block space-y-1.5 text-sm font-medium', className)} {...props} />;
}

export { Input, Label, Select, Textarea };
