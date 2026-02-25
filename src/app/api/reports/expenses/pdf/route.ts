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

  const pdfBytes = await generateReportPdf({
    title: 'Expense Report',
    subtitle: `${period.from.toLocaleDateString()} - ${period.to.toLocaleDateString()}`,
    summary: [
      { key: 'Total Daily Expenses', value: formatINR(report.totals.totalDailyExpenses) },
      { key: 'Total Admission Expenses', value: formatINR(report.totals.totalAdmissionExpenses) },
      { key: 'Total Expenses', value: formatINR(report.totals.totalExpense) },
      { key: 'Final Net Income', value: formatINR(report.totals.finalNetIncome) },
    ],
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="expense-report-${Date.now()}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}

