import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { canAccess } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/money';
import { Button } from '@/components/ui/button';

function scopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { agentId: user.id };
}

export default async function AdmissionsPage() {
  const user = await requireUser();

  if (user.role === Role.STAFF && !canAccess(user, 'admissionView')) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        You do not have permission to view admissions.
      </div>
    );
  }

  const admissions = await prisma.admission.findMany({
    where: scopeWhere(user),
    include: {
      university: true,
      course: true,
      agent: true,
      consultant: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const canCreate =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'admissionAdd'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admissions</h1>
          <p className="mt-1 text-sm text-zinc-600">
            All submitted admissions and their fee/profit breakdown.
          </p>
        </div>
        {canCreate ? (
          <Link href="/app/admissions/new">
            <Button>New Admission</Button>
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admissions List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Student</TH>
                  <TH>Course</TH>
                  <TH>Source</TH>
                  <TH>Received</TH>
                  <TH>Net Profit</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {admissions.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <div className="font-medium">{a.studentName}</div>
                      <div className="text-xs text-zinc-500">{a.mobile}</div>
                    </TD>
                    <TD>
                      <div className="font-medium">{a.course.name}</div>
                      <div className="text-xs text-zinc-500">{a.university.name}</div>
                    </TD>
                    <TD>
                      {a.source === 'DIRECT' ? (
                        <Badge>Direct</Badge>
                      ) : (
                        <div>
                          <Badge variant="warning">Agent</Badge>
                          <div className="text-xs text-zinc-500">{a.agent?.name ?? '—'}</div>
                        </div>
                      )}
                    </TD>
                    <TD>{formatINR(a.amountReceived)}</TD>
                    <TD>{formatINR(a.netProfit)}</TD>
                    <TD className="text-right">
                      <Link className="text-sm underline" href={`/app/admissions/${a.id}`}>
                        View
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {admissions.length === 0 ? (
            <div className="text-sm text-zinc-600">No admissions yet.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
