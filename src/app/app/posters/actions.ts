'use server';

import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createPosterSchema, posterStatusSchema } from '@/lib/validation';
import { canAccess } from '@/lib/roles';
import { logAuditEvent } from '@/lib/audit';

export async function createPosterAction(payload: unknown): Promise<{ id: string }> {
  const user = await requireUser();
  if (user.role !== Role.SUPER_ADMIN) throw new Error('Only Super Admin can create posters.');

  const parsed = createPosterSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid poster payload');
  const data = parsed.data;

  const imageUrl = data.imageFile?.url || data.imageUrl || '';
  if (!imageUrl) throw new Error('Poster image is required.');

  if (data.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
      select: { universityId: true },
    });
    if (!course) throw new Error('Course not found');
    if (data.universityId && course.universityId !== data.universityId) {
      throw new Error('Course does not belong to selected university.');
    }
  }

  const poster = await prisma.poster.create({
    data: {
      title: data.title,
      imageUrl,
      universityId: data.universityId || null,
      courseId: data.courseId || null,
      tags: data.tags,
      qrTargetPath: data.qrTargetPath,
      isActive: data.isActive,
      createdById: user.id,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    action: 'POSTER_CREATED',
    entityType: 'Poster',
    entityId: poster.id,
    metadata: {
      title: poster.title,
      qrTargetPath: poster.qrTargetPath,
      isActive: poster.isActive,
      universityId: poster.universityId,
      courseId: poster.courseId,
    },
  });

  revalidatePath('/app/posters');
  return { id: poster.id };
}

export async function setPosterStatusAction(payload: unknown): Promise<void> {
  const user = await requireUser();
  if (user.role !== Role.SUPER_ADMIN) throw new Error('Only Super Admin can update poster status.');

  const parsed = posterStatusSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid poster status payload');
  const data = parsed.data;

  const previous = await prisma.poster.findUnique({
    where: { id: data.posterId },
    select: { id: true, isActive: true, title: true },
  });
  if (!previous) throw new Error('Poster not found.');

  const poster = await prisma.poster.update({
    where: { id: data.posterId },
    data: { isActive: data.isActive },
    select: { id: true, isActive: true, title: true },
  });

  await logAuditEvent({
    actorId: user.id,
    action: poster.isActive ? 'POSTER_UPDATED' : 'POSTER_DEACTIVATED',
    entityType: 'Poster',
    entityId: poster.id,
    metadata: { beforeActive: previous.isActive, afterActive: poster.isActive, title: poster.title },
  });

  revalidatePath('/app/posters');
}

export async function deletePosterAction(posterId: string): Promise<void> {
  const user = await requireUser();
  if (user.role !== Role.SUPER_ADMIN) throw new Error('Only Super Admin can delete posters.');

  const poster = await prisma.poster.findUnique({
    where: { id: posterId },
    select: { id: true, title: true },
  });
  if (!poster) return;

  await prisma.poster.delete({ where: { id: poster.id } });
  await logAuditEvent({
    actorId: user.id,
    action: 'POSTER_DELETED',
    entityType: 'Poster',
    entityId: poster.id,
    metadata: { title: poster.title },
  });

  revalidatePath('/app/posters');
}

export async function canViewPostersAction(): Promise<boolean> {
  const user = await requireUser();
  return (
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'postersManage'))
  );
}
