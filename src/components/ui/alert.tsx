import * as React from 'react';
import { cn } from '@/lib/utils';

export function Alert({
  className,
  variant = 'info',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'info' | 'error' | 'success' }) {
  const styles: Record<string, string> = {
    info: 'border-zinc-200 bg-zinc-50 text-zinc-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };
  return (
    <div
      className={cn('rounded-md border px-4 py-3 text-sm', styles[variant], className)}
      {...props}
    />
  );
}
