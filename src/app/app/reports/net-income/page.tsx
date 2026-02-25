import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { buildReportData } from '@/lib/reporting';
import { buildMonthlyIncomeExpenseTrend } from '@/lib/trends';
import { formatINR } from '@/lib/money';
import { ReportFilterBar } from '@/components/reports/filter-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { FinancialTrendChart } from '@/components/charts/financial-trend-chart';

export default async function NetIncomeReportPage({
  searchParams,
}: {
  searchParams: { mode?: string; from?: string; to?: string };
}) {
  const user = await requireUser();

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'reportsView'));

  if (!canView) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const period = parsePeriodFilter(searchParams);
  const report = await buildReportData({
    user: { id: user.id, role: user.role, parentId: user.parentId },
    from: period.from,
    to: period.to,
  });
  const trend = buildMonthlyIncomeExpenseTrend({
    from: period.from,
    to: period.to,
    admissions: report.admissions,
    dailyExpenses: report.dailyExpenses,
    admissionExpenses: report.admissionExpenses,
  });

  const exportQuery = new URLSearchParams({
    mode: period.mode,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  }).toString();

  const totalAdmissionExpense = report.totals.totalAdmissionExpenses;
  const totalDailyExpense = report.totals.totalDailyExpenses;
  const totalExpense = report.totals.totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Net Income Report</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Dedicated view for income, expenses, and final net income.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline" href={`/api/exports/reports/net-income?${exportQuery}`}>
            CSV Export
          </Link>
          <Link className="underline" href={`/api/reports/pdf?${exportQuery}&type=net-income`}>
            PDF Export
          </Link>
          <Link className="underline" href={`/app/reports?${exportQuery}`}>
            Back to Unified Report
          </Link>
        </div>
      </div>

      <ReportFilterBar mode={period.mode} from={period.from} to={period.to} />

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialTrendChart data={trend} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(report.totals.totalIncome)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Profit</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(report.totals.totalNetProfit)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admission Expense</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(totalAdmissionExpense)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Expense</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(totalDailyExpense)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Final Net Income</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(report.totals.finalNetIncome)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Net Income Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Metric</TH>
                  <TH className="text-right">Amount</TH>
                </TR>
              </THead>
              <TBody>
                <TR>
                  <TD>Total Income</TD>
                  <TD className="text-right">{formatINR(report.totals.totalIncome)}</TD>
                </TR>
                <TR>
                  <TD>Total Net Profit</TD>
                  <TD className="text-right">{formatINR(report.totals.totalNetProfit)}</TD>
                </TR>
                <TR>
                  <TD>Total Admission Expense</TD>
                  <TD className="text-right">{formatINR(totalAdmissionExpense)}</TD>
                </TR>
                <TR>
                  <TD>Total Daily Expense</TD>
                  <TD className="text-right">{formatINR(totalDailyExpense)}</TD>
                </TR>
                <TR>
                  <TD>Total Expense</TD>
                  <TD className="text-right">{formatINR(totalExpense)}</TD>
                </TR>
                <TR>
                  <TD>Final Net Income</TD>
                  <TD className="text-right font-semibold">
                    {formatINR(report.totals.finalNetIncome)}
                  </TD>
                </TR>
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
