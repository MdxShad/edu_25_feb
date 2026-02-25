'use server';

import { PaymentStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import {
  aiAdmissionSummarySchema,
  aiPosterCaptionSchema,
  aiReminderSchema,
} from '@/lib/validation';
import {
  generateAdmissionSummary,
  generatePendingPaymentMessage,
  generatePosterCaption,
} from '@/lib/ai';
import { logAuditEvent } from '@/lib/audit';

function admissionScopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { agentId: user.id };
}

function ensureCanUseAi(user: { role: Role; permissions: unknown | null }) {
  const allowed =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'reportsView'));
  if (!allowed) throw new Error('Not allowed');
}

export async function generateAdmissionSummaryAction(payload: unknown): Promise<{ text: string }> {
  const user = await requireUser();
  ensureCanUseAi(user);

  const parsed = aiAdmissionSummarySchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid admission id');

  const admission = await prisma.admission.findFirst({
    where: { id: parsed.data.admissionId, ...admissionScopeWhere(user) },
    include: { university: true, course: true },
  });
  if (!admission) throw new Error('Admission not found');

  const text = await generateAdmissionSummary({
    studentName: admission.studentName,
    university: admission.university.name,
    course: admission.course.name,
    source: admission.source,
    amountReceived: admission.amountReceived,
    universityFee: admission.universityFee,
    agentCommissionAmount: admission.agentCommissionAmount,
    totalExpenses: admission.agentExpensesTotal + admission.consultancyExpensesTotal,
    netProfit: admission.netProfit,
  });

  await logAuditEvent({
    actorId: user.id,
    action: 'AI_ADMISSION_SUMMARY_GENERATED',
    entityType: 'Admission',
    entityId: admission.id,
    metadata: { source: 'app-ai' },
  });

  return { text };
}

export async function generatePendingReminderAction(payload: unknown): Promise<{ text: string }> {
  const user = await requireUser();
  ensureCanUseAi(user);

  const parsed = aiReminderSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid reminder payload');

  const maxRows = parsed.data.maxRows;
  const universityRows = await prisma.universityLedger.findMany({
    where: { status: PaymentStatus.PENDING, admission: admissionScopeWhere(user) },
    include: { admission: true, university: true },
    orderBy: { updatedAt: 'asc' },
    take: maxRows,
  });

  const rows = universityRows.map((row) => ({
    studentName: row.admission.studentName,
    university: row.university.name,
    pending: Math.max(0, row.amountPayable - row.amountPaid),
    type: 'University',
  }));

  const text = await generatePendingPaymentMessage({
    consultantName: user.name,
    rows,
  });

  await logAuditEvent({
    actorId: user.id,
    action: 'AI_PENDING_REMINDER_GENERATED',
    entityType: 'Ledger',
    metadata: { rows: rows.length, source: 'app-ai' },
  });

  return { text };
}

export async function generatePosterCaptionAction(payload: unknown): Promise<{ text: string }> {
  const user = await requireUser();
  ensureCanUseAi(user);

  const parsed = aiPosterCaptionSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid topic');

  const text = await generatePosterCaption(parsed.data.topic);
  await logAuditEvent({
    actorId: user.id,
    action: 'AI_POSTER_CAPTION_GENERATED',
    entityType: 'Poster',
    metadata: { topic: parsed.data.topic, source: 'app-ai' },
  });

  return { text };
}
