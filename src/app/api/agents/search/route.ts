import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === Role.AGENT) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role === Role.STAFF && !canAccess(user, 'admissionAdd')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ items: [] });

  const consultantIdParam = (url.searchParams.get('consultantId') ?? '').trim();

  let parentIdFilter: string | null = null;
  if (user.role === Role.SUPER_ADMIN) {
    parentIdFilter = consultantIdParam || null;
  } else if (user.role === Role.CONSULTANT) {
    parentIdFilter = user.id;
  } else if (user.role === Role.STAFF) {
    parentIdFilter = user.parentId ?? '__NONE__';
  }

  const items = await prisma.user.findMany({
    where: {
      role: Role.AGENT,
      isActive: true,
      ...(parentIdFilter ? { parentId: parentIdFilter } : {}),
      OR: [
        { userId: { startsWith: q, mode: 'insensitive' } },
        { userId: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, userId: true, name: true, parentId: true },
    orderBy: [{ userId: 'asc' }],
    take: 8,
  });

  return NextResponse.json({ items });
}

