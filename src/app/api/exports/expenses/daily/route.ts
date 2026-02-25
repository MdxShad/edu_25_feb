import { NextResponse } from 'next/server';
import { ExpenseType, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { toCsv } from '@/lib/csv';

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

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'expenseAdd'));
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const period = parsePeriodFilter({
    mode: url.searchParams.get('mode') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  });

  const rows = await prisma.expense.findMany({
    where: { ...expenseScopeWhere(user), date: { gte: period.from, lte: period.to } },
    include: { createdBy: true },
    orderBy: { date: 'desc' },
  });

  const csv = toCsv(
    rows.map((row) => ({
      date: row.date.toISOString(),
      title: row.title,
      category: row.category ?? 'OTHER',
      amount: row.amount,
      createdBy: row.createdBy?.name ?? '',
      proofUrl: row.proofUrl ?? '',
    }))
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"daily-expenses-${Date.now()}.csv\"`,
    },
  });
}
