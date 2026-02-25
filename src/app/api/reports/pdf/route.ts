import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { buildReportData } from '@/lib/reporting';
import { formatINR } from '@/lib/money';
import { generateReportPdf } from '@/lib/pdf/documents';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') ?? 'reports';
  const canReports =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'reportsView'));
  const canExpenses =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'expenseAdd'));

  if ((type === 'expense' && !canExpenses) || (type !== 'expense' && !canReports)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  const summary =
    type === 'expense'
      ? [
          { key: 'Total Income', value: formatINR(report.totals.totalIncome) },
          { key: 'Total Profit', value: formatINR(report.totals.totalNetProfit) },
          { key: 'Daily Expenses', value: formatINR(report.totals.totalDailyExpenses) },
          { key: 'Net Income', value: formatINR(report.totals.finalNetIncome) },
        ]
      : type === 'net-income'
        ? [
            { key: 'Total Income', value: formatINR(report.totals.totalIncome) },
            { key: 'Total Net Profit', value: formatINR(report.totals.totalNetProfit) },
            { key: 'Admission Expenses', value: formatINR(report.totals.totalAdmissionExpenses) },
            { key: 'Daily Expenses', value: formatINR(report.totals.totalDailyExpenses) },
            { key: 'Total Expenses', value: formatINR(report.totals.totalExpense) },
            { key: 'Final Net Income', value: formatINR(report.totals.finalNetIncome) },
          ]
        : [
            { key: 'Admissions', value: String(report.totals.totalAdmissions) },
            { key: 'Total Income', value: formatINR(report.totals.totalIncome) },
            { key: 'Net Profit', value: formatINR(report.totals.totalNetProfit) },
            { key: 'Total Expenses', value: formatINR(report.totals.totalExpense) },
            { key: 'Final Net Income', value: formatINR(report.totals.finalNetIncome) },
          ];

  const pdfBytes = await generateReportPdf({
    title:
      type === 'expense'
        ? 'Expense Summary Report'
        : type === 'net-income'
          ? 'Net Income Report'
          : 'CRM Report Summary',
    subtitle: `${period.from.toLocaleDateString()} - ${period.to.toLocaleDateString()}`,
    summary,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=\"${type}-report-${Date.now()}.pdf\"`,
      'Cache-Control': 'no-store',
    },
  });
}
