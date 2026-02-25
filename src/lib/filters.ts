import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns';

export type PeriodMode = 'daily' | 'monthly' | 'yearly' | 'custom';

export type PeriodFilter = {
  mode: PeriodMode;
  from: Date;
  to: Date;
  label: string;
};

function safeDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parsePeriodFilter(searchParams: {
  mode?: string;
  from?: string;
  to?: string;
}): PeriodFilter {
  const now = new Date();
  const mode = (searchParams.mode ?? 'monthly') as PeriodMode;

  if (mode === 'daily') {
    return {
      mode,
      from: startOfDay(now),
      to: endOfDay(now),
      label: format(now, 'PPP'),
    };
  }

  if (mode === 'yearly') {
    return {
      mode,
      from: startOfYear(now),
      to: endOfYear(now),
      label: format(now, 'yyyy'),
    };
  }

  if (mode === 'custom') {
    const fromValue = safeDate(searchParams.from) ?? startOfMonth(now);
    const toValue = safeDate(searchParams.to) ?? endOfMonth(now);
    return {
      mode,
      from: startOfDay(fromValue),
      to: endOfDay(toValue),
      label: `${format(fromValue, 'PPP')} - ${format(toValue, 'PPP')}`,
    };
  }

  return {
    mode: 'monthly',
    from: startOfMonth(now),
    to: endOfMonth(now),
    label: format(now, 'MMMM yyyy'),
  };
}

export function toDateInput(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
