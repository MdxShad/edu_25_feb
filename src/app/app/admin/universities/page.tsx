import { Role } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UniversityManager } from './university-manager';

export default async function UniversitiesPage() {
  await requireRole([Role.SUPER_ADMIN]);

  const universities = await prisma.university.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      location: true,
      contactPerson: true,
      contactNumber: true,
      email: true,
      address: true,
      notes: true,
    },
  });

  return <UniversityManager universities={universities} />;
}
