'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createAgentSchema, agentCommissionSchema } from '@/lib/validation';
import { Role, CommissionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export async function createAgentAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.SUPER_ADMIN && user.role !== Role.CONSULTANT) {
    throw new Error('Not allowed');
  }

  const idProofFileUrl = String(formData.get('idProofFileUrl') ?? '').trim();
  const idProofFileSizeRaw = String(formData.get('idProofFileSizeBytes') ?? '').trim();
  const parsedSize = Number.parseInt(idProofFileSizeRaw, 10);

  const raw = {
    userId: String(formData.get('userId') ?? ''),
    password: String(formData.get('password') ?? ''),
    name: String(formData.get('name') ?? ''),
    mobile: String(formData.get('mobile') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: String(formData.get('address') ?? ''),
    idProofUrl: String(formData.get('idProofUrl') ?? ''),
    idProofFile: idProofFileUrl
      ? {
          url: idProofFileUrl,
          fileName: String(formData.get('idProofFileName') ?? ''),
          mimeType: String(formData.get('idProofFileMimeType') ?? ''),
          sizeBytes: Number.isFinite(parsedSize) ? parsedSize : undefined,
        }
      : undefined,
    isActive: formData.get('isActive') ?? 'true',
  };

  const parsed = createAgentSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid agent data');

  const parentId =
    user.role === Role.CONSULTANT
      ? user.id
      : String(formData.get('parentConsultantId') ?? '').trim();
  if (user.role === Role.SUPER_ADMIN && !parentId) throw new Error('Parent consultant required');

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      userId: parsed.data.userId.trim(),
      name: parsed.data.name.trim(),
      role: Role.AGENT,
      parentId,
      mobile: parsed.data.mobile?.trim() || null,
      email: parsed.data.email?.trim() || null,
      address: parsed.data.address?.trim() || null,
      idProofUrl: parsed.data.idProofFile?.url || parsed.data.idProofUrl?.trim() || null,
      isActive: parsed.data.isActive ?? true,
      passwordHash,
    },
  });

  revalidatePath('/app/agents');
}

export async function toggleAgentActiveAction(agentId: string) {
  const user = await requireUser();
  if (user.role !== Role.SUPER_ADMIN && user.role !== Role.CONSULTANT) {
    throw new Error('Not allowed');
  }

  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { id: true, parentId: true, role: true, isActive: true },
  });
  if (!agent || agent.role !== Role.AGENT) return;

  if (user.role === Role.CONSULTANT && agent.parentId !== user.id) {
    throw new Error('Not allowed');
  }

  await prisma.user.update({ where: { id: agentId }, data: { isActive: !agent.isActive } });
  revalidatePath('/app/agents');
  revalidatePath(`/app/agents/${agentId}`);
}

export async function upsertAgentCommissionAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.SUPER_ADMIN && user.role !== Role.CONSULTANT) {
    throw new Error('Not allowed');
  }

  const raw = {
    agentId: String(formData.get('agentId') ?? ''),
    courseId: String(formData.get('courseId') ?? ''),
    type: String(formData.get('type') ?? ''),
    value: formData.get('value') ?? 0,
    isActive: formData.get('isActive') ?? 'false',
  };

  // Convert type
  const parsed = agentCommissionSchema.safeParse({
    ...raw,
    type: raw.type as CommissionType,
  });

  if (!parsed.success) throw new Error('Invalid commission data');

  const agent = await prisma.user.findUnique({
    where: { id: parsed.data.agentId },
    select: { role: true, parentId: true },
  });
  if (!agent || agent.role !== Role.AGENT) throw new Error('Invalid agent');

  if (user.role === Role.CONSULTANT && agent.parentId !== user.id) throw new Error('Not allowed');

  await prisma.agentCommission.upsert({
    where: { agentId_courseId: { agentId: parsed.data.agentId, courseId: parsed.data.courseId } },
    update: { type: parsed.data.type, value: parsed.data.value, isActive: parsed.data.isActive },
    create: {
      agentId: parsed.data.agentId,
      courseId: parsed.data.courseId,
      type: parsed.data.type,
      value: parsed.data.value,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath(`/app/agents/${parsed.data.agentId}`);
}
