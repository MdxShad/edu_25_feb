import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExpenseType, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatINR } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { deleteAdmissionAction, updateAdmissionContactAction } from '../actions';

function canViewAdmission(
  user: { id: string; role: Role; parentId: string | null },
  admission: { consultantId: string; agentId: string | null }
) {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.CONSULTANT) return admission.consultantId === user.id;
  if (user.role === Role.STAFF) return admission.consultantId === (user.parentId ?? '__NONE__');
  return admission.agentId === user.id;
}

export default async function AdmissionDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  if (user.role === Role.STAFF && !canAccess(user, 'admissionView')) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        You do not have permission to view admissions.
      </div>
    );
  }

  const admission = await prisma.admission.findUnique({
    where: { id: params.id },
    include: {
      university: true,
      course: true,
      agent: true,
      consultant: true,
      expenses: true,
      documentsRows: { orderBy: { createdAt: 'desc' } },
      changes: { include: { actor: true }, orderBy: { createdAt: 'desc' } },
      universityLedger: true,
      agentLedger: true,
      profitLedger: true,
    },
  });
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: 'Admission', entityId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (!admission) return notFound();
  if (!canViewAdmission(user, admission)) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const agentExpenses = admission.expenses.filter((expense) => expense.type === ExpenseType.AGENT);
  const consultancyExpenses = admission.expenses.filter(
    (expense) => expense.type === ExpenseType.CONSULTANCY
  );
  const canEditContact =
    user.role === Role.SUPER_ADMIN ||
    (user.role === Role.CONSULTANT && admission.consultantId === user.id) ||
    (user.role === Role.STAFF &&
      admission.consultantId === (user.parentId ?? '__NONE__') &&
      canAccess(user, 'admissionEdit'));
  const canDelete = user.role === Role.SUPER_ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admission</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {admission.studentName} • {admission.course.name} • {admission.university.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/admissions" className="text-sm underline">
            Back
          </Link>
          <a href={`/app/admissions/${admission.id}/print`} target="_blank" rel="noreferrer">
            <Button variant="secondary">Printable View</Button>
          </a>
          <a href={`/api/admissions/${admission.id}/slip`} target="_blank" rel="noreferrer">
            <Button>Admission Slip (PDF)</Button>
          </a>
          <a href={`/api/admissions/${admission.id}/fee-receipt`} target="_blank" rel="noreferrer">
            <Button variant="secondary">Fee Receipt (PDF)</Button>
          </a>
          {canDelete ? (
            <form action={deleteAdmissionAction.bind(null, admission.id)}>
              <Button variant="ghost" type="submit">
                Delete Admission
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-500">Student</div>
              <div className="font-medium">{admission.studentName}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Father name</div>
              <div className="font-medium">{admission.fatherName ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Mobile</div>
              <div className="font-medium">{admission.mobile}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Alt mobile</div>
              <div className="font-medium">{admission.altMobile ?? '-'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-zinc-500">Address</div>
              <div className="font-medium">{admission.address ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Status</div>
              <div className="font-medium">
                <Badge variant={admission.status === 'SUBMITTED' ? 'success' : 'default'}>
                  {admission.status}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Submit Lock</div>
              <div className="font-medium">{admission.submittedAt ? 'Locked' : 'Draft'}</div>
            </div>
            {canEditContact ? (
              <form
                action={updateAdmissionContactAction}
                className="md:col-span-2 mt-2 grid gap-2 rounded-md border border-zinc-200 p-3 md:grid-cols-3"
              >
                <input type="hidden" name="admissionId" value={admission.id} />
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500">Mobile</label>
                  <input
                    className="h-9 w-full rounded-md border border-zinc-300 px-2 text-sm"
                    name="mobile"
                    defaultValue={admission.mobile}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500">Alt Mobile</label>
                  <input
                    className="h-9 w-full rounded-md border border-zinc-300 px-2 text-sm"
                    name="altMobile"
                    defaultValue={admission.altMobile ?? ''}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500">Address</label>
                  <input
                    className="h-9 w-full rounded-md border border-zinc-300 px-2 text-sm"
                    name="address"
                    defaultValue={admission.address ?? ''}
                  />
                </div>
                <div className="md:col-span-3">
                  <Button type="submit" size="sm" variant="secondary">
                    Save contact update
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              {admission.source === 'DIRECT' ? (
                <Badge>Direct</Badge>
              ) : (
                <Badge variant="warning">Agent</Badge>
              )}
            </div>
            {admission.agent ? (
              <div className="text-sm">
                <div className="font-medium">{admission.agent.name}</div>
                <div className="text-xs text-zinc-500">{admission.agent.userId}</div>
              </div>
            ) : (
              <div className="text-sm text-zinc-600">-</div>
            )}
            <div className="text-xs text-zinc-500">Admission session</div>
            <div className="text-sm font-medium">{admission.admissionSession ?? '-'}</div>
            <div className="text-xs text-zinc-500">Consultant</div>
            <div className="text-sm font-medium">{admission.consultant.name}</div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fee & Profit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total received</span>
              <span className="font-medium">{formatINR(admission.amountReceived)}</span>
            </div>
            <div className="flex justify-between">
              <span>University payable</span>
              <span className="font-medium">{formatINR(admission.universityFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>Consultancy profit</span>
              <span className="font-medium">{formatINR(admission.consultancyProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span>Agent commission</span>
              <span className="font-medium">{formatINR(admission.agentCommissionAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Agent expenses</span>
              <span className="font-medium">{formatINR(admission.agentExpensesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Consultancy expenses</span>
              <span className="font-medium">{formatINR(admission.consultancyExpensesTotal)}</span>
            </div>
            <div className="mt-2 border-t border-zinc-200 pt-2 flex justify-between">
              <span className="font-semibold">Final net profit</span>
              <span className="font-semibold">{formatINR(admission.netProfit)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ledgers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-medium">University ledger</div>
              <div className="flex justify-between">
                <span>Paid</span>
                <span>{formatINR(admission.universityLedger?.amountPaid ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending</span>
                <span>
                  {formatINR(
                    Math.max(
                      0,
                      (admission.universityLedger?.amountPayable ?? 0) -
                        (admission.universityLedger?.amountPaid ?? 0)
                    )
                  )}
                </span>
              </div>
            </div>
            <div>
              <div className="font-medium">Agent ledger</div>
              {admission.agentLedger ? (
                <>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span>{formatINR(admission.agentLedger.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span>
                      {formatINR(
                        Math.max(
                          0,
                          admission.agentLedger.commissionAmount - admission.agentLedger.amountPaid
                        )
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-zinc-600">No agent ledger.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {admission.documentsRows.length === 0 ? (
            <div className="text-sm text-zinc-600">No uploaded files.</div>
          ) : (
            <div className="space-y-2">
              {admission.documentsRows.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {document.label || document.fileName || document.kind}
                    </div>
                    <div className="text-xs text-zinc-500">{document.kind}</div>
                  </div>
                  <a
                    className="text-sm underline"
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Title</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {agentExpenses.map((expense) => (
                    <TR key={expense.id}>
                      <TD>{expense.title}</TD>
                      <TD className="text-right">{formatINR(expense.amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            {agentExpenses.length === 0 ? (
              <div className="text-sm text-zinc-600">No agent expenses.</div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consultancy Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Title</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {consultancyExpenses.map((expense) => (
                    <TR key={expense.id}>
                      <TD>{expense.title}</TD>
                      <TD className="text-right">{formatINR(expense.amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            {consultancyExpenses.length === 0 ? (
              <div className="text-sm text-zinc-600">No consultancy expenses.</div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          {admission.changes.length === 0 ? (
            <div className="text-sm text-zinc-600">No history entries.</div>
          ) : (
            <div className="space-y-2">
              {admission.changes.map((change) => (
                <div key={change.id} className="rounded-md border border-zinc-200 p-3 text-sm">
                  <div className="font-medium">{change.action}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(change.createdAt).toLocaleString()} by{' '}
                    {change.actor?.name ?? 'System'}
                  </div>
                  {change.details ? (
                    <pre className="mt-2 overflow-x-auto text-xs text-zinc-700">
                      {JSON.stringify(change.details, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="text-sm text-zinc-600">No audit log entries.</div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded border border-zinc-200 p-3 text-sm">
                  <div className="font-medium">
                    {log.action} {log.success ? '' : '(failed)'}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                  {log.metadata ? (
                    <pre className="mt-2 overflow-x-auto text-xs text-zinc-700">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
