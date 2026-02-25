import { NextResponse } from 'next/server';
import { LeadStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { toCsv } from '@/lib/csv';

function canViewLeads(user: { role: Role; permissions: unknown | null }) {
  return (
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'leadsView'))
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canViewLeads(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const period = parsePeriodFilter({
    mode: url.searchParams.get('mode') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  });
  const q = (url.searchParams.get('q') ?? '').trim();
  const statusRaw = url.searchParams.get('status') ?? '';
  const status = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'WON'].includes(statusRaw)
    ? (statusRaw as LeadStatus)
    : undefined;
  const mine = url.searchParams.get('mine') === '1';

  const leads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: period.from, lte: period.to },
      ...(status ? { status } : {}),
      ...(mine ? { assignedToId: user.id } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  const csv = toCsv(
    leads.map((lead) => ({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? '',
      message: lead.message,
      source: lead.source ?? '',
      status: lead.status,
      assignedToId: lead.assignedToId ?? '',
      handledAt: lead.handledAt?.toISOString() ?? '',
      internalNotes: lead.internalNotes ?? '',
      pageUrl: lead.pageUrl ?? '',
      createdAt: lead.createdAt.toISOString(),
    }))
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${Date.now()}.csv"`,
    },
  });
}
