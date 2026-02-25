'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { DocumentKind, ExpenseType, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { canAccess } from '@/lib/roles';
import { dailyExpenseSchema } from '@/lib/validation';
import { invalidateFinancialCaches } from '@/lib/cache-invalidation';
import { logAuditEvent } from '@/lib/audit';
import { assertOpenPeriod } from '@/lib/month-close';

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
    proofFileName: formData.get('proofFileName'),
    proofMimeType: formData.get('proofMimeType'),
    proofSizeBytes: formData.get('proofSizeBytes'),
  });
  if (!parsed.success) throw new Error('Invalid expense payload');
  const data = parsed.data;
  const expenseDate = data.date ? new Date(data.date) : new Date();
  await assertOpenPeriod(expenseDate, user.role === Role.SUPER_ADMIN);

  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
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

    if (data.proofUrl) {
      await tx.admissionDocument.create({
        data: {
          expenseId: expense.id,
          kind: DocumentKind.EXPENSE_PROOF,
          label: `Daily expense proof (${expense.title})`,
          fileName: data.proofFileName || null,
          mimeType: data.proofMimeType || null,
          sizeBytes: data.proofSizeBytes ?? null,
          url: data.proofUrl,
          uploadedById: user.id,
        },
      });
    }
  });

  await logAuditEvent({
    actorId: user.id,
    action: 'DAILY_EXPENSE_CREATED',
    entityType: 'Expense',
    metadata: { title: data.title, category: data.category, amount: Math.trunc(data.amount), date: expenseDate.toISOString() },
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
    select: { id: true, createdById: true, type: true, title: true, amount: true, category: true, date: true },
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

  await assertOpenPeriod(expense.date, user.role === Role.SUPER_ADMIN);

  await prisma.expense.delete({ where: { id } });

  await logAuditEvent({
    actorId: user.id,
    action: 'DAILY_EXPENSE_DELETED',
    entityType: 'Expense',
    entityId: expense.id,
    metadata: { title: expense.title, amount: expense.amount, category: expense.category, date: expense.date.toISOString() },
  });

  revalidatePath('/app/expenses/daily');
  revalidatePath('/app');
  invalidateFinancialCaches();
}
