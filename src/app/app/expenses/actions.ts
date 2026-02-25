'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ExpenseType, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { canAccess } from '@/lib/roles';
import { dailyExpenseSchema } from '@/lib/validation';
import { invalidateFinancialCaches } from '@/lib/cache-invalidation';

export async function addDailyExpenseAction(formData: FormData) {
  const user = await requireUser();

  const allowed =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'expenseAdd'));

  if (!allowed) throw new Error('Not allowed');

  const parsed = dailyExpenseSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category') || 'OTHER',
    amount: formData.get('amount'),
    date: formData.get('date'),
    proofUrl: formData.get('proofUrl'),
  });
  if (!parsed.success) throw new Error('Invalid expense payload');
  const data = parsed.data;
  const expenseDate = data.date ? new Date(data.date) : new Date();

  await prisma.expense.create({
    data: {
      type: ExpenseType.DAILY,
      category: data.category,
      title: data.title,
      amount: Math.trunc(data.amount),
      proofUrl: data.proofUrl || null,
      date: expenseDate,
      createdById: user.id,
    },
  });

  revalidatePath('/app/expenses/daily');
  revalidatePath('/app');
  invalidateFinancialCaches();
}

export async function deleteDailyExpenseAction(id: string) {
  const user = await requireUser();

  const allowed =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'expenseAdd'));

  if (!allowed) throw new Error('Not allowed');

  const expense = await prisma.expense.findUnique({
    where: { id },
    select: { createdById: true, type: true },
  });
  if (!expense || expense.type !== ExpenseType.DAILY) return;

  // Scope: consultants can delete their own + their staff expenses
  if (user.role === Role.CONSULTANT) {
    const createdBy = await prisma.user.findUnique({
      where: { id: expense.createdById ?? '' },
      select: { id: true, parentId: true },
    });
    if (createdBy && createdBy.id !== user.id && createdBy.parentId !== user.id)
      throw new Error('Not allowed');
  }
  if (user.role === Role.STAFF) {
    const createdBy = await prisma.user.findUnique({
      where: { id: expense.createdById ?? '' },
      select: { parentId: true, id: true },
    });
    if (
      createdBy &&
      createdBy.parentId !== (user.parentId ?? '__NONE__') &&
      createdBy.id !== user.parentId
    )
      throw new Error('Not allowed');
  }

  await prisma.expense.delete({ where: { id } });
  revalidatePath('/app/expenses/daily');
  revalidatePath('/app');
  invalidateFinancialCaches();
}
