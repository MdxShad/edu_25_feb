'use server';

import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { createStaffSchema } from '@/lib/validation';

export async function createConsultantAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const userId = String(formData.get('userId') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const mobile = String(formData.get('mobile') ?? '').trim();

  if (userId.length < 2 || password.length < 4 || name.length < 2) {
    throw new Error('Invalid consultant data');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      userId,
      name,
      role: Role.CONSULTANT,
      email: email || null,
      mobile: mobile || null,
      passwordHash,
      isActive: true,
    },
  });

  revalidatePath('/app/admin/users');
}

export async function createStaffAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const raw = {
    userId: String(formData.get('userId') ?? ''),
    password: String(formData.get('password') ?? ''),
    name: String(formData.get('name') ?? ''),
    parentConsultantId: String(formData.get('parentConsultantId') ?? ''),
    permissions: formData.getAll('permissions').map((v) => String(v)),
  };

  const parsed = createStaffSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid staff data');

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      userId: parsed.data.userId.trim(),
      name: parsed.data.name.trim(),
      role: Role.STAFF,
      parentId: parsed.data.parentConsultantId ? parsed.data.parentConsultantId : null,
      passwordHash,
      permissions: parsed.data.permissions,
      isActive: true,
    },
  });

  revalidatePath('/app/admin/users');
}

export async function toggleUserActiveAction(id: string) {
  await requireRole([Role.SUPER_ADMIN]);

  const user = await prisma.user.findUnique({
    where: { id },
    select: { isActive: true, role: true },
  });
  if (!user) return;
  if (user.role === Role.SUPER_ADMIN) return;

  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  revalidatePath('/app/admin/users');
}

export async function resetUserPasswordAction(id: string, formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const password = String(formData.get('password') ?? '').trim();
  if (password.length < 4) throw new Error('Password too short');

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  revalidatePath('/app/admin/users');
}
