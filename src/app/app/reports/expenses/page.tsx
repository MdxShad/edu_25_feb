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

type ExpenseSummaryRow = {
  key: string;
  source: 'DAILY' | 'ADMISSION';
  category: string;
  count: number;
  total: number;
};

function buildExpenseSummary(report: Awaited<ReturnType<typeof buildReportData>>): ExpenseSummaryRow[] {
  const rows: ExpenseSummaryRow[] = [];
  const map = new Map<string, ExpenseSummaryRow>();

  for (const row of report.dailyExpenses) {
    const category = row.category || 'OTHER';
    const key = `DAILY:${category}`;
    const current = map.get(key) ?? { key, source: 'DAILY', category, count: 0, total: 0 };
    current.count += 1;
    current.total += row.amount;
    map.set(key, current);
  }

  for (const row of report.admissionExpenses) {
    const category = row.category || row.type || 'OTHER';
    const key = `ADMISSION:${category}`;
    const current = map.get(key) ?? { key, source: 'ADMISSION', category, count: 0, total: 0 };
    current.count += 1;
    current.total += row.amount;
    map.set(key, current);
  }

  rows.push(...map.values());
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

export default async function ExpenseReportPage({
  searchParams,
}: {
  searchParams: { mode?: string; from?: string; to?: string };
}) {
  const user = await requireUser();

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'expenseAdd'));

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
  const summaryRows = buildExpenseSummary(report);

  const exportQuery = new URLSearchParams({
    mode: period.mode,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  }).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Expense Report</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Daily and admission expenses by category with consolidated totals.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline" href={`/api/exports/reports/expenses?${exportQuery}`}>
            CSV Export
          </Link>
          <Link className="underline" href={`/api/reports/expenses/pdf?${exportQuery}`}>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Expense</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(report.totals.totalExpense)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Expense</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(report.totals.totalDailyExpenses)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admission Expense</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(report.totals.totalAdmissionExpenses)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Source</TH>
                  <TH>Category</TH>
                  <TH className="text-right">Entries</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {summaryRows.map((row) => (
                  <TR key={row.key}>
                    <TD>{row.source}</TD>
                    <TD>{row.category}</TD>
                    <TD className="text-right">{row.count}</TD>
                    <TD className="text-right">{formatINR(row.total)}</TD>
                  </TR>
                ))}
                {summaryRows.length === 0 ? (
                  <TR>
                    <TD colSpan={4} className="text-center text-zinc-500">
                      No expenses found for the selected period.
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
