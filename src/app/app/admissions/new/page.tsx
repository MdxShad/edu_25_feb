import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { canAccess } from '@/lib/roles';
import { AdmissionWizard } from './wizard';

export default async function NewAdmissionPage() {
  const user = await requireUser();

  if (user.role === Role.AGENT) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Agents cannot create admissions.
      </div>
    );
  }

  if (user.role === Role.STAFF && !canAccess(user, 'admissionAdd')) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        You do not have permission to add admissions.
      </div>
    );
  }

  const [universities, courses] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.course.findMany({
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        universityId: true,
        name: true,
        universityFee: true,
        displayFee: true,
        session: true,
      },
    }),
  ]);

  const consultants =
    user.role === Role.SUPER_ADMIN
      ? await prisma.user.findMany({
          where: { role: Role.CONSULTANT, isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, userId: true },
        })
      : [];

  const consultantScopeId =
    user.role === Role.CONSULTANT
      ? user.id
      : user.role === Role.STAFF
        ? (user.parentId ?? null)
        : null;

  const agents = await prisma.user.findMany({
    where: consultantScopeId
      ? { role: Role.AGENT, parentId: consultantScopeId, isActive: true }
      : { role: Role.AGENT, isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, userId: true, parentId: true },
  });

  const commissions = await prisma.agentCommission.findMany({
    where: { agentId: { in: agents.map((a) => a.id) } },
    select: { agentId: true, courseId: true, type: true, value: true, isActive: true },
  });

  return (
    <AdmissionWizard
      me={{ id: user.id, role: user.role, parentId: user.parentId }}
      consultants={consultants}
      universities={universities}
      courses={courses}
      agents={agents}
      commissions={commissions}
    />
  );
}
