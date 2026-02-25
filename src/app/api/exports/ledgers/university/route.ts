import { NextResponse } from 'next/server';
import { PaymentStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { toCsv } from '@/lib/csv';

function scopeAdmissionWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { consultantId: '__NONE__' };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
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

  const rows = await prisma.universityLedger.findMany({
    where: {
      admission: scopeAdmissionWhere(user),
      updatedAt: { gte: period.from, lte: period.to },
      ...(status ? { status } : {}),
    },
    include: { admission: true, university: true },
    orderBy: { updatedAt: 'desc' },
  });

  const csv = toCsv(
    rows.map((row) => ({
      admissionId: row.admissionId,
      student: row.admission.studentName,
      university: row.university.name,
      payable: row.amountPayable,
      paid: row.amountPaid,
      pending: Math.max(0, row.amountPayable - row.amountPaid),
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    }))
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"university-ledger-${Date.now()}.csv\"`,
    },
  });
}
