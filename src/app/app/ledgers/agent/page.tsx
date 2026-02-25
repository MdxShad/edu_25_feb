import Link from 'next/link';
import { PaymentStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { ReportFilterBar } from '@/components/reports/filter-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/money';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProofUploadField } from '@/components/uploads/proof-upload-field';
import { addAgentPaymentAction } from '../actions';
import { PaymentHistoryModal } from '../payment-history-modal';

function scopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { admission: { consultantId: user.id } };
  if (user.role === Role.STAFF) return { admission: { consultantId: user.parentId ?? '__NONE__' } };
  return { agentId: user.id };
}

export default async function AgentLedgerPage({
  searchParams,
}: {
  searchParams: { mode?: string; from?: string; to?: string; status?: string };
}) {
  const user = await requireUser();

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'accountsView'));

  if (!canView) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const canEdit =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'accountsView'));

  const period = parsePeriodFilter(searchParams);
  const statusFilter =
    searchParams.status === 'PAID' || searchParams.status === 'PENDING'
      ? (searchParams.status as PaymentStatus)
      : undefined;

  const ledgers = await prisma.agentLedger.findMany({
    where: {
      ...scopeWhere(user),
      updatedAt: { gte: period.from, lte: period.to },
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      agent: true,
      payouts: { orderBy: { paidAt: 'desc' } },
      admission: { include: { course: true, university: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const totalPayable = ledgers.reduce((sum, ledger) => sum + ledger.commissionAmount, 0);
  const totalPaid = ledgers.reduce((sum, ledger) => sum + ledger.amountPaid, 0);
  const totalPending = Math.max(0, totalPayable - totalPaid);

  const exportQuery = new URLSearchParams({
    mode: period.mode,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
    ...(statusFilter ? { status: statusFilter } : {}),
  }).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agent Ledger</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Commission payable, paid, and pending by admission.
          </p>
        </div>
        <Link className="text-sm underline" href={`/api/exports/ledgers/agents?${exportQuery}`}>
          Export CSV
        </Link>
      </div>

      <ReportFilterBar mode={period.mode} from={period.from} to={period.to} />

      <form className="rounded-md border border-zinc-200 p-3 text-sm" method="get">
        <input type="hidden" name="mode" value={period.mode} />
        <input type="hidden" name="from" value={period.from.toISOString()} />
        <input type="hidden" name="to" value={period.to.toISOString()} />
        <label className="mr-2 font-medium">Status</label>
        <select
          name="status"
          defaultValue={statusFilter ?? ''}
          className="rounded border border-zinc-300 px-2 py-1"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
        </select>
        <Button type="submit" variant="secondary" size="sm" className="ml-2">
          Apply Status
        </Button>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Commission</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalPayable)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalPaid)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalPending)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Admission</TH>
                  <TH>Agent</TH>
                  <TH>Commission</TH>
                  <TH>Paid</TH>
                  <TH>Pending</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Record payout</TH>
                </TR>
              </THead>
              <TBody>
                {ledgers.map((ledger) => {
                  const pending = Math.max(0, ledger.commissionAmount - ledger.amountPaid);
                  const formId = `pay-a-${ledger.id}`;

                  return (
                    <TR key={ledger.id}>
                      <TD>
                        <Link
                          className="text-sm underline"
                          href={`/app/admissions/${ledger.admissionId}`}
                        >
                          {ledger.admission.studentName}
                        </Link>
                        <div className="text-xs text-zinc-500">
                          {ledger.admission.course.name} • {ledger.admission.university.name}
                        </div>
                      </TD>
                      <TD>
                        <div className="font-medium">{ledger.agent.name}</div>
                        <div className="text-xs text-zinc-500">{ledger.agent.userId}</div>
                      </TD>
                      <TD>{formatINR(ledger.commissionAmount)}</TD>
                      <TD>{formatINR(ledger.amountPaid)}</TD>
                      <TD>{formatINR(pending)}</TD>
                      <TD>
                        {ledger.status === PaymentStatus.PAID ? (
                          <Badge variant="success">PAID</Badge>
                        ) : (
                          <Badge variant="warning">PENDING</Badge>
                        )}
                      </TD>
                      <TD className="text-right">
                        {canEdit ? (
                          <form
                            id={formId}
                            action={addAgentPaymentAction.bind(null, ledger.id)}
                            className="grid gap-1 md:grid-cols-5"
                          >
                            <Input
                              name="amount"
                              type="number"
                              min={1}
                              max={pending}
                              step={1}
                              placeholder="Amount"
                              className="h-8"
                            />
                            <Input name="paidAt" type="date" className="h-8" />
                            <select
                              name="method"
                              className="h-8 rounded border border-zinc-300 bg-white px-2 text-xs"
                            >
                              <option value="BANK_TRANSFER">Bank</option>
                              <option value="UPI">UPI</option>
                              <option value="CASH">Cash</option>
                              <option value="CARD">Card</option>
                              <option value="CHEQUE">Cheque</option>
                              <option value="OTHER">Other</option>
                            </select>
                            <Input name="reference" placeholder="Reference" className="h-8" />
                            <ProofUploadField
                              id={`${formId}-proof`}
                              inputName="proofUrl"
                              label="Proof"
                              helpText="Upload receipt or screenshot"
                              className="md:col-span-5"
                            />
                            <Input name="notes" placeholder="Notes" className="h-8 md:col-span-4" />
                            <Button type="submit" size="sm" variant="secondary" className="h-8">
                              Add
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-zinc-500">View only</span>
                        )}
                        {ledger.payouts.length > 0 ? (
                          <>
                            <div className="mt-1 text-xs text-zinc-500">
                            Latest: {formatINR(ledger.payouts[0].amount)} on{' '}
                            {new Date(ledger.payouts[0].paidAt).toLocaleDateString()}{' '}
                            <a
                              className="underline"
                              href={`/api/ledgers/agents/${ledger.payouts[0].id}/slip`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              PDF
                            </a>
                            {ledger.payouts[0].proofUrl ? (
                              <>
                                {' '}•{' '}
                                <a
                                  className="underline"
                                  href={ledger.payouts[0].proofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Proof
                                </a>
                              </>
                            ) : null}
                          </div>
                          <PaymentHistoryModal
                            title={`Agent payouts • ${ledger.agent.name}`}
                            description={`All payout entries for ${ledger.admission.studentName}`}
                            entries={ledger.payouts.map((payout) => ({
                              id: payout.id,
                              amount: payout.amount,
                              paidAtIso: payout.paidAt.toISOString(),
                              method: payout.method,
                              reference: payout.reference,
                              notes: payout.notes,
                              proofUrl: payout.proofUrl,
                              slipUrl: `/api/ledgers/agents/${payout.id}/slip`,
                            }))}
                          />
                          </>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          {ledgers.length === 0 ? (
            <div className="text-sm text-zinc-600">No agent ledger entries found.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
