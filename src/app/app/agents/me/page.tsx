import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatINR } from '@/lib/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

export default async function AgentDashboardPage() {
  const user = await requireUser();
  if (user.role !== Role.AGENT) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const [admissions, payoutAgg] = await Promise.all([
    prisma.admission.findMany({
      where: { agentId: user.id },
      include: { course: true, university: true },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.agentLedger.aggregate({
      where: { agentId: user.id },
      _sum: { commissionAmount: true, amountPaid: true },
    }),
  ]);

  const totalCommission = payoutAgg._sum.commissionAmount ?? 0;
  const totalPaid = payoutAgg._sum.amountPaid ?? 0;
  const pendingPayout = Math.max(0, totalCommission - totalPaid);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Earnings Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          View your admissions, commissions, and pending payouts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Commission</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalCommission)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Paid Out</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalPaid)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Payout</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(pendingPayout)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Admissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Student</TH>
                  <TH>Course</TH>
                  <TH className="text-right">Received</TH>
                  <TH className="text-right">Commission</TH>
                  <TH className="text-right">Net Profit</TH>
                </TR>
              </THead>
              <TBody>
                {admissions.map((admission) => (
                  <TR key={admission.id}>
                    <TD>{new Date(admission.createdAt).toLocaleDateString()}</TD>
                    <TD>
                      <Link href={`/app/admissions/${admission.id}`} className="text-sm underline">
                        {admission.studentName}
                      </Link>
                    </TD>
                    <TD>
                      <div>{admission.course.name}</div>
                      <div className="text-xs text-zinc-500">{admission.university.name}</div>
                    </TD>
                    <TD className="text-right">{formatINR(admission.amountReceived)}</TD>
                    <TD className="text-right">{formatINR(admission.agentCommissionAmount)}</TD>
                    <TD className="text-right">{formatINR(admission.netProfit)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          {admissions.length === 0 ? (
            <p className="text-sm text-zinc-600">No admissions available.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
