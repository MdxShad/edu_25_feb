import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { buildReportData } from '@/lib/reporting';
import { toCsv } from '@/lib/csv';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'reportsView'));
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const period = parsePeriodFilter({
    mode: url.searchParams.get('mode') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  });

  const report = await buildReportData({
    user: { id: user.id, role: user.role, parentId: user.parentId },
    from: period.from,
    to: period.to,
  });

  const csv = toCsv(
    report.admissions.map((admission) => ({
      admissionId: admission.id,
      date: admission.createdAt.toISOString(),
      student: admission.studentName,
      university: admission.university.name,
      course: admission.course.name,
      source: admission.source,
      amountReceived: admission.amountReceived,
      universityFee: admission.universityFee,
      agentCommission: admission.agentCommissionAmount,
      netProfit: admission.netProfit,
    }))
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"reports-${Date.now()}.csv\"`,
    },
  });
}
