import { Role } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canAccess } from '@/lib/roles';
import { isAiEnabled } from '@/lib/env';
import { AiToolsClient } from './ai-tools';

function scopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { agentId: user.id };
}

export default async function AiPage() {
  const user = await requireUser();
  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'reportsView'));

  if (!canView) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  if (!isAiEnabled()) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">AI Tools</h1>
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          AI tools are disabled. Set <code>AI_FEATURES_ENABLED=true</code> and
          <code> NEXT_PUBLIC_AI_FEATURES_ENABLED=true</code> to enable this module.
        </div>
      </div>
    );
  }

  const admissions = await prisma.admission.findMany({
    where: scopeWhere(user),
    include: { university: true, course: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Tools</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Generate summaries, reminders, and campaign copy. Usage is logged in audit logs.
        </p>
      </div>
      <AiToolsClient
        admissions={admissions.map((admission) => ({
          id: admission.id,
          studentName: admission.studentName,
          universityName: admission.university.name,
          courseName: admission.course.name,
        }))}
      />
    </div>
  );
}
