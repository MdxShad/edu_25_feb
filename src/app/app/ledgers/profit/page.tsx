import Link from 'next/link';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { ReportFilterBar } from '@/components/reports/filter-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatINR } from '@/lib/money';

function scopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { admission: { consultantId: user.id } };
  if (user.role === Role.STAFF) return { admission: { consultantId: user.parentId ?? '__NONE__' } };
  return { admission: { consultantId: '__NONE__' } };
}

export default async function ProfitLedgerPage({
  searchParams,
}: {
  searchParams: { mode?: string; from?: string; to?: string };
}) {
  const user = await requireUser();

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'accountsView'));

  if (!canView) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const period = parsePeriodFilter(searchParams);
  const rows = await prisma.profitLedger.findMany({
    where: {
      ...scopeWhere(user),
      createdAt: { gte: period.from, lte: period.to },
    },
    include: {
      admission: { include: { course: true, university: true, agent: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const grossProfit = rows.reduce((sum, row) => sum + row.grossProfit, 0);
  const totalExpenses = rows.reduce(
    (sum, row) => sum + row.agentExpenses + row.consultancyExpenses,
    0
  );
  const totalNet = rows.reduce((sum, row) => sum + row.netProfit, 0);

  const exportQuery = new URLSearchParams({
    mode: period.mode,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  }).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Consultancy Profit Ledger</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Reconciles gross profit, expenses, and final net profit.
          </p>
        </div>
        <Link className="text-sm underline" href={`/api/exports/ledgers/profit?${exportQuery}`}>
          Export CSV
        </Link>
      </div>

      <ReportFilterBar mode={period.mode} from={period.from} to={period.to} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Gross Profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(grossProfit)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalExpenses)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalNet)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Admission</TH>
                  <TH>Course</TH>
                  <TH>Gross</TH>
                  <TH>Agent Commission</TH>
                  <TH>Expenses</TH>
                  <TH>Net</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <Link
                        className="text-sm underline"
                        href={`/app/admissions/${row.admissionId}`}
                      >
                        {row.admission.studentName}
                      </Link>
                      <div className="text-xs text-zinc-500">{row.admission.university.name}</div>
                    </TD>
                    <TD>
                      <div className="font-medium">{row.admission.course.name}</div>
                      <div className="text-xs text-zinc-500">
                        {row.admission.agent ? `Agent: ${row.admission.agent.name}` : 'Direct'}
                      </div>
                    </TD>
                    <TD>{formatINR(row.grossProfit)}</TD>
                    <TD>{formatINR(row.agentCommission)}</TD>
                    <TD>
                      <div>Agent: {formatINR(row.agentExpenses)}</div>
                      <div className="text-xs text-zinc-500">
                        Consultancy: {formatINR(row.consultancyExpenses)}
                      </div>
                    </TD>
                    <TD className="font-medium">{formatINR(row.netProfit)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {rows.length === 0 ? (
            <div className="text-sm text-zinc-600">No profit entries found.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
