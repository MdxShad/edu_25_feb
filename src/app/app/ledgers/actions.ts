'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { DocumentKind, PaymentStatus, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { canAccess } from '@/lib/roles';
import { ledgerPaymentSchema } from '@/lib/validation';
import { logAuditEvent } from '@/lib/audit';
import { invalidateFinancialCaches } from '@/lib/cache-invalidation';

function ensureCanEdit(user: { role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return;
  if (user.role === Role.CONSULTANT) return;
  if (user.role === Role.STAFF && canAccess(user as any, 'accountsView')) return;
  throw new Error('Not allowed');
}

export async function addUniversityPaymentAction(ledgerId: string, formData: FormData) {
  const user = await requireUser();
  ensureCanEdit(user);

  const parsed = ledgerPaymentSchema.safeParse({
    amount: formData.get('amount'),
    paidAt: formData.get('paidAt'),
    method: formData.get('method'),
    reference: formData.get('reference'),
    proofUrl: formData.get('proofUrl'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) throw new Error('Invalid payment payload');
  const data = parsed.data;
  const amount = Math.trunc(data.amount);
  const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();

  const ledger = await prisma.universityLedger.findUnique({
    where: { id: ledgerId },
    include: { admission: true, university: true },
  });
  if (!ledger) return;

  // Scope check
  if (user.role === Role.CONSULTANT && ledger.admission.consultantId !== user.id)
    throw new Error('Not allowed');
  if (user.role === Role.STAFF && ledger.admission.consultantId !== (user.parentId ?? '__NONE__'))
    throw new Error('Not allowed');

  const pending = Math.max(0, ledger.amountPayable - ledger.amountPaid);
  if (amount > pending) throw new Error('Amount is greater than pending payable');

  const newPaid = ledger.amountPaid + amount;
  const status = newPaid >= ledger.amountPayable ? PaymentStatus.PAID : PaymentStatus.PENDING;

  await prisma.$transaction(async (tx) => {
    await tx.universityPayment.create({
      data: {
        ledgerId,
        amount,
        paidAt,
        method: data.method,
        reference: data.reference || null,
        proofUrl: data.proofUrl || null,
        notes: data.notes || null,
        createdById: user.id,
      },
    });

    await tx.universityLedger.update({
      where: { id: ledgerId },
      data: { amountPaid: newPaid, status },
    });

    if (data.proofUrl) {
      await tx.admissionDocument.create({
        data: {
          admissionId: ledger.admissionId,
          kind: DocumentKind.UNIVERSITY_PAYMENT_PROOF,
          label: `University payment proof (${ledger.university.name})`,
          url: data.proofUrl,
          uploadedById: user.id,
        },
      });
    }

    await tx.admissionChange.create({
      data: {
        admissionId: ledger.admissionId,
        actorId: user.id,
        action: 'UNIVERSITY_PAYMENT_ADDED',
        details: {
          amount,
          method: data.method,
          reference: data.reference || null,
          paidAt: paidAt.toISOString(),
          ledgerId,
        },
      },
    });
  });

  revalidatePath('/app/ledgers/university');
  revalidatePath(`/app/admissions/${ledger.admissionId}`);
  invalidateFinancialCaches();

  await logAuditEvent({
    actorId: user.id,
    action: 'UNIVERSITY_PAYMENT_CREATED',
    entityType: 'UniversityLedger',
    entityId: ledger.id,
    metadata: { amount, paidAt: paidAt.toISOString(), method: data.method },
  });
}

export async function addAgentPaymentAction(ledgerId: string, formData: FormData) {
  const user = await requireUser();
  ensureCanEdit(user);

  const parsed = ledgerPaymentSchema.safeParse({
    amount: formData.get('amount'),
    paidAt: formData.get('paidAt'),
    method: formData.get('method'),
    reference: formData.get('reference'),
    proofUrl: formData.get('proofUrl'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) throw new Error('Invalid payment payload');
  const data = parsed.data;
  const amount = Math.trunc(data.amount);
  const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();

  const ledger = await prisma.agentLedger.findUnique({
    where: { id: ledgerId },
    include: { admission: true, agent: true },
  });
  if (!ledger) return;

  // Scope check
  if (user.role === Role.CONSULTANT && ledger.admission.consultantId !== user.id)
    throw new Error('Not allowed');
  if (user.role === Role.STAFF && ledger.admission.consultantId !== (user.parentId ?? '__NONE__'))
    throw new Error('Not allowed');

  const pending = Math.max(0, ledger.commissionAmount - ledger.amountPaid);
  if (amount > pending) throw new Error('Amount is greater than pending payout');

  const newPaid = ledger.amountPaid + amount;
  const status = newPaid >= ledger.commissionAmount ? PaymentStatus.PAID : PaymentStatus.PENDING;

  await prisma.$transaction(async (tx) => {
    await tx.agentPayout.create({
      data: {
        ledgerId,
        amount,
        paidAt,
        method: data.method,
        reference: data.reference || null,
        proofUrl: data.proofUrl || null,
        notes: data.notes || null,
        createdById: user.id,
      },
    });

    await tx.agentLedger.update({
      where: { id: ledgerId },
      data: { amountPaid: newPaid, status },
    });

    if (data.proofUrl) {
      await tx.admissionDocument.create({
        data: {
          admissionId: ledger.admissionId,
          kind: DocumentKind.AGENT_PAYMENT_PROOF,
          label: `Agent payout proof (${ledger.agent.name})`,
          url: data.proofUrl,
          uploadedById: user.id,
        },
      });
    }

    await tx.admissionChange.create({
      data: {
        admissionId: ledger.admissionId,
        actorId: user.id,
        action: 'AGENT_PAYOUT_ADDED',
        details: {
          amount,
          method: data.method,
          reference: data.reference || null,
          paidAt: paidAt.toISOString(),
          ledgerId,
        },
      },
    });
  });

  revalidatePath('/app/ledgers/agent');
  revalidatePath(`/app/admissions/${ledger.admissionId}`);
  invalidateFinancialCaches();

  await logAuditEvent({
    actorId: user.id,
    action: 'AGENT_PAYOUT_CREATED',
    entityType: 'AgentLedger',
    entityId: ledger.id,
    metadata: { amount, paidAt: paidAt.toISOString(), method: data.method },
  });
}
