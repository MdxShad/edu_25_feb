import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { buildReportData } from '@/lib/reporting';
import { toCsv } from '@/lib/csv';

type CsvRow = {
  source: 'DAILY' | 'ADMISSION';
  category: string;
  title: string;
  amount: number;
  date: string;
  admissionId: string;
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'expenseAdd'));
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const period = parsePeriodFilter({
    mode: url.searchParams.get('mode') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  });

  const report = await buildReportData({
    user: { id: user.id, role: user.role, parentId: user.parentId },
    from: period.from,
    to: period.to,
  });

  const dailyRows: CsvRow[] = report.dailyExpenses.map((row) => ({
    source: 'DAILY',
    category: row.category || 'OTHER',
    title: row.title,
    amount: row.amount,
    date: row.date.toISOString(),
    admissionId: '',
  }));
  const admissionRows: CsvRow[] = report.admissionExpenses.map((row) => ({
    source: 'ADMISSION',
    category: row.category || row.type || 'OTHER',
    title: row.title,
    amount: row.amount,
    date: row.date.toISOString(),
    admissionId: row.admissionId || '',
  }));

  const summaryRows = [
    {
      source: 'SUMMARY',
      category: '',
      title: 'Total Daily Expenses',
      amount: report.totals.totalDailyExpenses,
      date: '',
      admissionId: '',
    },
    {
      source: 'SUMMARY',
      category: '',
      title: 'Total Admission Expenses',
      amount: report.totals.totalAdmissionExpenses,
      date: '',
      admissionId: '',
    },
    {
      source: 'SUMMARY',
      category: '',
      title: 'Total Expenses',
      amount: report.totals.totalExpense,
      date: '',
      admissionId: '',
    },
  ];

  const csv = toCsv([...dailyRows, ...admissionRows, ...summaryRows]);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="expense-report-${Date.now()}.csv"`,
    },
  });
}

