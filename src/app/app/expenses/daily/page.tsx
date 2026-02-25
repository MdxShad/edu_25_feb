import Link from 'next/link';
import { ExpenseType, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { ReportFilterBar } from '@/components/reports/filter-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/money';
import { deleteDailyExpenseAction } from '../actions';
import { QuickAddExpenseModal } from './quick-add-modal';

function expenseScopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return { type: ExpenseType.DAILY };

  const consultantId =
    user.role === Role.CONSULTANT
      ? user.id
      : user.role === Role.STAFF
        ? (user.parentId ?? '__NONE__')
        : '__NONE__';

  return {
    type: ExpenseType.DAILY,
    OR: [{ createdById: consultantId }, { createdBy: { parentId: consultantId } }],
  };
}

function admissionScopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { consultantId: '__NONE__' };
}

export default async function DailyExpensesPage({
  searchParams,
}: {
  searchParams: { mode?: string; from?: string; to?: string };
}) {
  const user = await requireUser();

  const allowed =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'expenseAdd'));

  if (!allowed) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const period = parsePeriodFilter(searchParams);

  const [expenses, admissions] = await Promise.all([
    prisma.expense.findMany({
      where: { ...expenseScopeWhere(user), date: { gte: period.from, lte: period.to } },
      include: { createdBy: true },
      orderBy: { date: 'desc' },
    }),
    prisma.admission.findMany({
      where: { ...admissionScopeWhere(user), createdAt: { gte: period.from, lte: period.to } },
      select: { amountReceived: true, netProfit: true },
    }),
  ]);

  const totalExpense = expenses.reduce((sum, row) => sum + row.amount, 0);
  const totalIncome = admissions.reduce((sum, row) => sum + row.amountReceived, 0);
  const totalProfit = admissions.reduce((sum, row) => sum + row.netProfit, 0);
  const finalNetIncome = totalProfit - totalExpense;

  const categoryTotals = new Map<string, number>();
  for (const row of expenses) {
    const key = row.category ?? 'OTHER';
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + row.amount);
  }
  const maxCategory = Math.max(1, ...categoryTotals.values());

  const exportQuery = new URLSearchParams({
    mode: period.mode,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  }).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Daily Expense Register</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Track daily costs and monthly financial summary.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="text-sm underline" href={`/api/exports/expenses/daily?${exportQuery}`}>
            CSV Export
          </Link>
          <Link className="text-sm underline" href={`/api/reports/pdf?${exportQuery}&type=expense`}>
            PDF Export
          </Link>
          <QuickAddExpenseModal />
        </div>
      </div>

      <ReportFilterBar mode={period.mode} from={period.from} to={period.to} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalIncome)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalProfit)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Expense</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalExpense)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Income</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(finalNetIncome)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...categoryTotals.entries()].map(([category, amount]) => (
            <div key={category} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{category}</span>
                <span>{formatINR(amount)}</span>
              </div>
              <div className="h-2 rounded bg-zinc-100">
                <div
                  className="h-2 rounded bg-zinc-900"
                  style={{ width: `${Math.round((amount / maxCategory) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          {categoryTotals.size === 0 ? (
            <div className="text-sm text-zinc-600">No expense data in this period.</div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Title</TH>
                  <TH>Category</TH>
                  <TH>Created by</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {expenses.map((expense) => (
                  <TR key={expense.id}>
                    <TD>{new Date(expense.date).toLocaleDateString()}</TD>
                    <TD>
                      <div className="font-medium">{expense.title}</div>
                      {expense.proofUrl ? (
                        <a
                          href={expense.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline"
                        >
                          Proof
                        </a>
                      ) : null}
                    </TD>
                    <TD>{expense.category ?? 'OTHER'}</TD>
                    <TD>{expense.createdBy?.name ?? '-'}</TD>
                    <TD className="text-right">{formatINR(expense.amount)}</TD>
                    <TD className="text-right">
                      <form action={deleteDailyExpenseAction.bind(null, expense.id)}>
                        <Button size="sm" type="submit" variant="ghost">
                          Delete
                        </Button>
                      </form>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {expenses.length === 0 ? (
            <div className="text-sm text-zinc-600">No daily expenses found.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
