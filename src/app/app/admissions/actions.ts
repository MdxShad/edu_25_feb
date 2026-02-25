'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createAdmissionSchema, updateAdmissionContactSchema } from '@/lib/validation';
import {
  AdmissionSource,
  AdmissionStatus,
  CommissionType,
  DocumentKind,
  ExpenseType,
  PaymentStatus,
  Role,
} from '@prisma/client';
import { calculateAdmissionFinancials } from '@/lib/calculations';
import { revalidatePath } from 'next/cache';
import { logAuditEvent } from '@/lib/audit';
import { canAccess } from '@/lib/roles';
import { invalidateFinancialCaches } from '@/lib/cache-invalidation';

export async function createAdmissionAction(payload: unknown): Promise<{ id: string }> {
  const user = await requireUser();

  // Security rule: Agent cannot create admissions
  if (user.role === Role.AGENT) {
    await logAuditEvent({
      actorId: user.id,
      action: 'ADMISSION_CREATE_BLOCKED',
      success: false,
      entityType: 'Admission',
      metadata: { reason: 'AGENT_ROLE' },
    });
    throw new Error('Agent is not allowed to create admissions.');
  }

  const parsed = createAdmissionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error('Invalid admission payload');
  }

  const data = parsed.data;

  // Resolve consultant scope
  let consultantId: string;
  if (user.role === Role.CONSULTANT) {
    consultantId = user.id;
  } else if (user.role === Role.STAFF) {
    if (!user.parentId) throw new Error('Staff is not assigned to any consultant.');
    consultantId = user.parentId;
  } else {
    // SUPER_ADMIN
    if (!data.consultantId) throw new Error('Consultant is required for Super Admin admissions.');
    consultantId = data.consultantId;
  }

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    include: { university: true },
  });
  if (!course) throw new Error('Course not found');
  if (course.universityId !== data.universityId)
    throw new Error('Course does not belong to the selected university');

  let agentId: string | null = null;
  let agentCommissionType: CommissionType | null = null;
  let agentCommissionValue: number | null = null;

  if (data.source === AdmissionSource.AGENT) {
    if (!data.agentId) throw new Error('Agent is required when source = AGENT');

    const agent = await prisma.user.findUnique({
      where: { id: data.agentId },
      select: { id: true, role: true, parentId: true, isActive: true },
    });
    if (!agent || agent.role !== Role.AGENT || !agent.isActive) throw new Error('Invalid agent');
    if (agent.parentId !== consultantId)
      throw new Error('Agent does not belong to this consultant');

    agentId = agent.id;

    const commission = await prisma.agentCommission.findFirst({
      where: { agentId: agent.id, courseId: course.id, isActive: true },
    });

    if (commission) {
      agentCommissionType = commission.type;
      agentCommissionValue = commission.value;
    }
  }

  const agentExpensesTotal = data.agentExpenses.reduce(
    (sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0),
    0
  );
  const consultancyExpensesTotal = data.consultancyExpenses.reduce(
    (sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0),
    0
  );

  const fin = calculateAdmissionFinancials({
    amountReceived: data.amountReceived,
    universityFee: course.universityFee,
    agentCommission:
      agentId && agentCommissionType && agentCommissionValue !== null
        ? { type: agentCommissionType, value: agentCommissionValue }
        : { type: 'NONE' },
    agentExpensesTotal,
    consultancyExpensesTotal,
  });

  const dob = data.dob ? new Date(data.dob) : null;
  const normalizedDob = dob && !Number.isNaN(dob.getTime()) ? dob : null;

  const admission = await prisma.$transaction(async (tx) => {
    const created = await tx.admission.create({
      data: {
        createdById: user.id,
        consultantId,
        agentId,
        status: AdmissionStatus.SUBMITTED,
        submittedAt: new Date(),

        studentName: data.studentName,
        fatherName: data.fatherName || null,
        mobile: data.mobile,
        altMobile: data.altMobile || null,
        address: data.address || null,
        dob: normalizedDob,
        gender: data.gender || null,
        photoUrl: data.photoFile?.url || data.photoUrl || null,
        documents: data.documents ?? [],

        universityId: course.universityId,
        courseId: course.id,
        admissionSession: data.admissionSession.trim(),

        amountReceived: data.amountReceived,
        source: data.source,

        universityFee: course.universityFee,
        displayFee: course.displayFee,
        consultancyProfit: fin.consultancyProfit,

        agentCommissionType,
        agentCommissionValue,
        agentCommissionAmount: fin.agentCommissionAmount,

        agentExpensesTotal,
        consultancyExpensesTotal,
        netProfit: fin.netProfit,
      },
    });

    // Expenses
    for (const e of data.agentExpenses) {
      const expense = await tx.expense.create({
        data: {
          type: ExpenseType.AGENT,
          title: e.title,
          amount: e.amount,
          proofUrl: e.proofFile?.url || e.proofUrl || null,
          admissionId: created.id,
          createdById: user.id,
        },
      });

      if (e.proofFile || e.proofUrl) {
        await tx.admissionDocument.create({
          data: {
            admissionId: created.id,
            expenseId: expense.id,
            kind: DocumentKind.EXPENSE_PROOF,
            label: `Agent expense: ${expense.title}`,
            fileName: e.proofFile?.fileName || null,
            mimeType: e.proofFile?.mimeType || null,
            sizeBytes: e.proofFile?.sizeBytes,
            url: e.proofFile?.url || e.proofUrl || '',
            uploadedById: user.id,
          },
        });
      }
    }

    for (const e of data.consultancyExpenses) {
      const expense = await tx.expense.create({
        data: {
          type: ExpenseType.CONSULTANCY,
          title: e.title,
          amount: e.amount,
          proofUrl: e.proofFile?.url || e.proofUrl || null,
          admissionId: created.id,
          createdById: user.id,
        },
      });

      if (e.proofFile || e.proofUrl) {
        await tx.admissionDocument.create({
          data: {
            admissionId: created.id,
            expenseId: expense.id,
            kind: DocumentKind.EXPENSE_PROOF,
            label: `Consultancy expense: ${expense.title}`,
            fileName: e.proofFile?.fileName || null,
            mimeType: e.proofFile?.mimeType || null,
            sizeBytes: e.proofFile?.sizeBytes,
            url: e.proofFile?.url || e.proofUrl || '',
            uploadedById: user.id,
          },
        });
      }
    }

    if (data.photoFile || data.photoUrl) {
      await tx.admissionDocument.create({
        data: {
          admissionId: created.id,
          kind: DocumentKind.PHOTO,
          label: 'Student Photo',
          fileName: data.photoFile?.fileName || null,
          mimeType: data.photoFile?.mimeType || null,
          sizeBytes: data.photoFile?.sizeBytes,
          url: data.photoFile?.url || data.photoUrl || '',
          uploadedById: user.id,
        },
      });
    }

    if (data.documents.length > 0) {
      await tx.admissionDocument.createMany({
        data: data.documents.map((doc) => ({
          admissionId: created.id,
          kind: DocumentKind.STUDENT_DOCUMENT,
          label: doc.fileName || 'Student Document',
          fileName: doc.fileName || null,
          mimeType: doc.mimeType || null,
          sizeBytes: doc.sizeBytes,
          url: doc.url,
          uploadedById: user.id,
        })),
      });
    }

    // Ledgers
    await tx.universityLedger.create({
      data: {
        admissionId: created.id,
        universityId: created.universityId,
        amountPayable: created.universityFee,
        amountPaid: 0,
        status: PaymentStatus.PENDING,
      },
    });

    if (created.agentId) {
      await tx.agentLedger.create({
        data: {
          admissionId: created.id,
          agentId: created.agentId,
          commissionAmount: created.agentCommissionAmount,
          amountPaid: 0,
          status: PaymentStatus.PENDING,
        },
      });
    }

    await tx.profitLedger.create({
      data: {
        admissionId: created.id,
        grossProfit: created.consultancyProfit,
        agentCommission: created.agentCommissionAmount,
        agentExpenses: created.agentExpensesTotal,
        consultancyExpenses: created.consultancyExpensesTotal,
        netProfit: created.netProfit,
      },
    });

    await tx.admissionChange.create({
      data: {
        admissionId: created.id,
        actorId: user.id,
        action: 'SUBMITTED',
        details: {
          source: created.source,
          admissionSession: created.admissionSession,
          amountReceived: created.amountReceived,
          universityFee: created.universityFee,
          consultancyProfit: created.consultancyProfit,
          agentCommissionAmount: created.agentCommissionAmount,
          netProfit: created.netProfit,
        },
      },
    });

    return created;
  });

  revalidatePath('/app/admissions');
  revalidatePath('/app');
  invalidateFinancialCaches();

  await logAuditEvent({
    actorId: user.id,
    action: 'ADMISSION_CREATED',
    entityType: 'Admission',
    entityId: admission.id,
    metadata: {
      consultantId: admission.consultantId,
      source: admission.source,
      admissionSession: admission.admissionSession,
      amountReceived: admission.amountReceived,
      netProfit: admission.netProfit,
    },
  });

  return { id: admission.id };
}

export async function updateAdmissionContactAction(payload: unknown): Promise<void> {
  const user = await requireUser();

  if (user.role === Role.AGENT) {
    throw new Error('Agent is not allowed to edit admissions.');
  }
  if (user.role === Role.STAFF && !canAccess(user, 'admissionEdit')) {
    throw new Error('Not allowed');
  }

  const raw =
    payload instanceof FormData
      ? {
          admissionId: payload.get('admissionId'),
          mobile: payload.get('mobile'),
          altMobile: payload.get('altMobile'),
          address: payload.get('address'),
        }
      : payload;

  const parsed = updateAdmissionContactSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid update payload');
  const data = parsed.data;

  const admission = await prisma.admission.findUnique({
    where: { id: data.admissionId },
    select: {
      id: true,
      consultantId: true,
      status: true,
      mobile: true,
      altMobile: true,
      address: true,
    },
  });
  if (!admission) throw new Error('Admission not found');

  const allowed =
    user.role === Role.SUPER_ADMIN ||
    (user.role === Role.CONSULTANT && admission.consultantId === user.id) ||
    (user.role === Role.STAFF && admission.consultantId === (user.parentId ?? '__NONE__'));
  if (!allowed) throw new Error('Not allowed');

  await prisma.admission.update({
    where: { id: admission.id },
    data: {
      mobile: data.mobile,
      altMobile: data.altMobile || null,
      address: data.address || null,
    },
  });

  await prisma.admissionChange.create({
    data: {
      admissionId: admission.id,
      actorId: user.id,
      action: 'CONTACT_UPDATED',
      details: {
        before: {
          mobile: admission.mobile,
          altMobile: admission.altMobile,
          address: admission.address,
        },
        after: {
          mobile: data.mobile,
          altMobile: data.altMobile || null,
          address: data.address || null,
        },
      },
    },
  });

  await logAuditEvent({
    actorId: user.id,
    action: 'ADMISSION_UPDATED',
    entityType: 'Admission',
    entityId: admission.id,
    metadata: { fields: ['mobile', 'altMobile', 'address'] },
  });

  revalidatePath(`/app/admissions/${admission.id}`);
  revalidatePath('/app/admissions');
}

export async function deleteAdmissionAction(admissionId: string): Promise<void> {
  const user = await requireUser();
  if (user.role !== Role.SUPER_ADMIN) {
    throw new Error('Only Super Admin can delete admissions.');
  }

  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    select: { id: true, studentName: true },
  });
  if (!admission) return;

  await prisma.admission.delete({ where: { id: admission.id } });

  await logAuditEvent({
    actorId: user.id,
    action: 'ADMISSION_DELETED',
    entityType: 'Admission',
    entityId: admission.id,
    metadata: { studentName: admission.studentName },
  });

  revalidatePath('/app/admissions');
  revalidatePath('/app');
  invalidateFinancialCaches();
}
