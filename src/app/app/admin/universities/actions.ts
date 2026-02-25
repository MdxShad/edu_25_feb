'use server';

import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { universitySchema } from '@/lib/validation';

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; formError: string; fieldErrors?: Record<string, string[]> };

type UniversityInput = {
  name: string;
  location?: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export async function createUniversityAction(
  input: UniversityInput
): Promise<ActionResult<{ id: string }>> {
  await requireRole([Role.SUPER_ADMIN]);

  const parsed = universitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      formError: 'Please correct the highlighted fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const created = await prisma.university.create({
    data: {
      name: parsed.data.name,
      location: parsed.data.location || null,
      contactPerson: parsed.data.contactPerson || null,
      contactNumber: parsed.data.contactNumber || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath('/app/admin/universities');
  return { ok: true, data: { id: created.id } };
}

export async function updateUniversityAction(
  id: string,
  input: UniversityInput
): Promise<ActionResult> {
  await requireRole([Role.SUPER_ADMIN]);

  const parsed = universitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      formError: 'Please correct the highlighted fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.university.update({
    where: { id },
    data: {
      name: parsed.data.name,
      location: parsed.data.location || null,
      contactPerson: parsed.data.contactPerson || null,
      contactNumber: parsed.data.contactNumber || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath('/app/admin/universities');
  revalidatePath(`/app/admin/universities/${id}`);
  return { ok: true };
}

export async function deleteUniversityAction(id: string): Promise<ActionResult> {
  await requireRole([Role.SUPER_ADMIN]);

  const inUse = await prisma.course.count({ where: { universityId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      formError: 'Cannot delete university while courses exist. Delete related courses first.',
    };
  }

  await prisma.university.delete({ where: { id } });
  revalidatePath('/app/admin/universities');
  revalidatePath('/app/admin/courses');
  return { ok: true };
}
