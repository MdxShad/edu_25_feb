import { NextResponse } from 'next/server';
import { PaymentStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { toCsv } from '@/lib/csv';

function scopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { admission: { consultantId: user.id } };
  if (user.role === Role.STAFF) return { admission: { consultantId: user.parentId ?? '__NONE__' } };
  return { agentId: user.id };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'accountsView'));
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const period = parsePeriodFilter({
    mode: url.searchParams.get('mode') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  });

  const statusParam = url.searchParams.get('status');
  const status =
    statusParam === 'PENDING' || statusParam === 'PAID'
      ? (statusParam as PaymentStatus)
      : undefined;

  const rows = await prisma.agentLedger.findMany({
    where: {
      ...scopeWhere(user),
      updatedAt: { gte: period.from, lte: period.to },
      ...(status ? { status } : {}),
    },
    include: { admission: true, agent: true },
    orderBy: { updatedAt: 'desc' },
  });

  const csv = toCsv(
    rows.map((row) => ({
      admissionId: row.admissionId,
      student: row.admission.studentName,
      agent: `${row.agent.name} (${row.agent.userId})`,
      commission: row.commissionAmount,
      paid: row.amountPaid,
      pending: Math.max(0, row.commissionAmount - row.amountPaid),
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    }))
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"agent-ledger-${Date.now()}.csv\"`,
    },
  });
}
