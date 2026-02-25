'use server';

import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { courseSchema } from '@/lib/validation';

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; formError: string; fieldErrors?: Record<string, string[]> };

type CourseInput = {
  universityId: string;
  name: string;
  duration?: string;
  type?: string;
  universityFee: number;
  displayFee: number;
  session?: string;
  notes?: string;
};

async function ensureUniversityExists(universityId: string): Promise<boolean> {
  const university = await prisma.university.findUnique({
    where: { id: universityId },
    select: { id: true },
  });
  return Boolean(university);
}

export async function createCourseAction(
  input: CourseInput
): Promise<ActionResult<{ id: string }>> {
  await requireRole([Role.SUPER_ADMIN]);

  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      formError: 'Please correct the highlighted fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const exists = await ensureUniversityExists(parsed.data.universityId);
  if (!exists) {
    return {
      ok: false,
      formError: 'Selected university does not exist.',
      fieldErrors: { universityId: ['Selected university does not exist.'] },
    };
  }

  const created = await prisma.course.create({
    data: {
      universityId: parsed.data.universityId,
      name: parsed.data.name,
      duration: parsed.data.duration || null,
      type: parsed.data.type || null,
      universityFee: parsed.data.universityFee,
      displayFee: parsed.data.displayFee,
      session: parsed.data.session || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath('/app/admin/courses');
  return { ok: true, data: { id: created.id } };
}

export async function updateCourseAction(id: string, input: CourseInput): Promise<ActionResult> {
  await requireRole([Role.SUPER_ADMIN]);

  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      formError: 'Please correct the highlighted fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const exists = await ensureUniversityExists(parsed.data.universityId);
  if (!exists) {
    return {
      ok: false,
      formError: 'Selected university does not exist.',
      fieldErrors: { universityId: ['Selected university does not exist.'] },
    };
  }

  await prisma.course.update({
    where: { id },
    data: {
      universityId: parsed.data.universityId,
      name: parsed.data.name,
      duration: parsed.data.duration || null,
      type: parsed.data.type || null,
      universityFee: parsed.data.universityFee,
      displayFee: parsed.data.displayFee,
      session: parsed.data.session || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath('/app/admin/courses');
  revalidatePath(`/app/admin/courses/${id}`);
  return { ok: true };
}

export async function deleteCourseAction(id: string): Promise<ActionResult> {
  await requireRole([Role.SUPER_ADMIN]);

  const inUse = await prisma.admission.count({ where: { courseId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      formError: 'Cannot delete course while admissions reference it.',
    };
  }

  await prisma.course.delete({ where: { id } });
  revalidatePath('/app/admin/courses');
  return { ok: true };
}
