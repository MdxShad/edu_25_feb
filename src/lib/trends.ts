import { addMonths, format, isAfter, startOfMonth } from 'date-fns';

type AdmissionLike = { createdAt: Date; amountReceived: number };
type ExpenseLike = { date: Date; amount: number };

export type IncomeExpenseTrendPoint = {
  label: string;
  income: number;
  expense: number;
};

function monthKey(date: Date): string {
  return format(startOfMonth(date), 'yyyy-MM');
}

export function buildMonthlyIncomeExpenseTrend(input: {
  from: Date;
  to: Date;
  admissions: AdmissionLike[];
  dailyExpenses: ExpenseLike[];
  admissionExpenses: ExpenseLike[];
}): IncomeExpenseTrendPoint[] {
  const rows: IncomeExpenseTrendPoint[] = [];
  const incomeByMonth = new Map<string, number>();
  const expenseByMonth = new Map<string, number>();

  for (const row of input.admissions) {
    const key = monthKey(row.createdAt);
    incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + row.amountReceived);
  }

  for (const row of [...input.dailyExpenses, ...input.admissionExpenses]) {
    const key = monthKey(row.date);
    expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + row.amount);
  }

  let cursor = startOfMonth(input.from);
  const end = startOfMonth(input.to);
  while (!isAfter(cursor, end)) {
    const key = monthKey(cursor);
    rows.push({
      label: format(cursor, 'MMM yy'),
      income: incomeByMonth.get(key) ?? 0,
      expense: expenseByMonth.get(key) ?? 0,
    });
    cursor = addMonths(cursor, 1);
  }

  return rows;
}

