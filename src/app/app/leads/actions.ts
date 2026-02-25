'use server';

import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canAccess } from '@/lib/roles';
import { updateLeadSchema } from '@/lib/validation';
import { logAuditEvent } from '@/lib/audit';

function canManageLeads(user: { role: Role; permissions: unknown | null }) {
  return (
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'leadsManage'))
  );
}

export async function updateLeadAction(formData: FormData) {
  const user = await requireUser();
  if (!canManageLeads(user)) throw new Error('Not allowed');

  const parsed = updateLeadSchema.safeParse({
    leadId: formData.get('leadId'),
    status: formData.get('status'),
    assignedToId: formData.get('assignedToId'),
    internalNotes: formData.get('internalNotes'),
  });
  if (!parsed.success) throw new Error('Invalid lead payload');

  const data = parsed.data;
  const before = await prisma.lead.findUnique({ where: { id: data.leadId } });
  if (!before) return;

  const next = await prisma.lead.update({
    where: { id: data.leadId },
    data: {
      status: data.status,
      assignedToId: data.assignedToId || null,
      internalNotes: data.internalNotes || null,
      handledAt: data.status === 'NEW' ? null : new Date(),
    },
  });

  await logAuditEvent({
    actorId: user.id,
    action: 'LEAD_STATUS_UPDATED',
    entityType: 'Lead',
    entityId: next.id,
    metadata: {
      beforeStatus: before.status,
      afterStatus: next.status,
      beforeAssignedToId: before.assignedToId,
      afterAssignedToId: next.assignedToId,
    },
  });

  revalidatePath('/app/leads');
}
