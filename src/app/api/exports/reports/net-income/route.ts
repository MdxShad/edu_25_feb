import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { buildReportData } from '@/lib/reporting';
import { toCsv } from '@/lib/csv';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'reportsView'));
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

  const csv = toCsv([
    {
      mode: period.mode,
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      totalIncome: report.totals.totalIncome,
      totalNetProfit: report.totals.totalNetProfit,
      totalAdmissionExpenses: report.totals.totalAdmissionExpenses,
      totalDailyExpenses: report.totals.totalDailyExpenses,
      totalExpense: report.totals.totalExpense,
      finalNetIncome: report.totals.finalNetIncome,
    },
  ]);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="net-income-${Date.now()}.csv"`,
    },
  });
}

