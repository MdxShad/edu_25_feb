import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === Role.AGENT) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const mobile = normalizePhone((url.searchParams.get('mobile') ?? '').trim());
  if (!mobile || mobile.length < 8) return NextResponse.json({ items: [] });

  const where: any = {
    mobile,
    createdAt: { gte: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) },
  };
  if (user.role === Role.CONSULTANT) where.consultantId = user.id;
  if (user.role === Role.STAFF) where.consultantId = user.parentId ?? '__NONE__';

  const rows = await prisma.admission.findMany({
    where,
    select: { id: true, studentName: true, createdAt: true, mobile: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return NextResponse.json({ items: rows });
}
