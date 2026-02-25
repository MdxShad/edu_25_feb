import {
  AdmissionSource,
  AdmissionStatus,
  CommissionType,
  DocumentKind,
  ExpenseCategory,
  ExpenseType,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  Role,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type StaffPermission =
  | 'admissionView'
  | 'admissionAdd'
  | 'admissionEdit'
  | 'accountsView'
  | 'expenseAdd'
  | 'reportsView';

type SeedUser = {
  id: string;
  userId: string;
  role: Role;
};

type SeedCourse = {
  id: string;
  universityId: string;
  name: string;
  duration: string;
  type: string;
  universityFee: number;
  displayFee: number;
  session: string;
  notes: string;
};

type SeedAdmission = {
  id: string;
  createdById: string;
  consultantId: string;
  agentId: string | null;
  courseId: string;
  source: AdmissionSource;
  status: AdmissionStatus;
  createdAt: Date;
  studentName: string;
  fatherName: string;
  mobile: string;
  altMobile: string;
  address: string;
  dob: Date;
  gender: string;
  photoUrl: string;
  studentDocumentUrl: string;
  amountReceived: number;
  agentExpense: number;
  consultancyExpense: number;
  universityPaid: number;
  agentPaid: number;
};

type SeedCommissionRule = {
  agentId: string;
  courseId: string;
  type: CommissionType;
  value: number;
  isActive: boolean;
};

function envOr(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function daysAgo(days: number, hour = 11): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function calculateCommission(
  rule: SeedCommissionRule | undefined,
  consultancyProfit: number
): { type: CommissionType | null; value: number | null; amount: number } {
  if (!rule || !rule.isActive) {
    return { type: null, value: null, amount: 0 };
  }

  if (rule.type === CommissionType.PERCENT) {
    return {
      type: rule.type,
      value: rule.value,
      amount: clampNonNegativeInt((consultancyProfit * rule.value) / 100),
    };
  }

  return {
    type: rule.type,
    value: rule.value,
    amount: clampNonNegativeInt(rule.value),
  };
}

async function upsertUser(args: {
  userId: string;
  name: string;
  role: Role;
  password: string;
  parentId?: string | null;
  email?: string | null;
  mobile?: string | null;
  permissions?: StaffPermission[];
}): Promise<SeedUser> {
  const passwordHash = await bcrypt.hash(args.password, 12);

  return prisma.user.upsert({
    where: { userId: args.userId },
    update: {
      name: args.name,
      role: args.role,
      parentId: args.parentId ?? null,
      email: args.email ?? null,
      mobile: args.mobile ?? null,
      permissions: args.permissions ?? null,
      passwordHash,
      isActive: true,
    },
    create: {
      userId: args.userId,
      name: args.name,
      role: args.role,
      parentId: args.parentId ?? null,
      email: args.email ?? null,
      mobile: args.mobile ?? null,
      permissions: args.permissions ?? null,
      passwordHash,
      isActive: true,
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  });
}

async function main() {
  const shouldSeedDemoData = envBool('SEED_DEMO_DATA', true);
  const demoPassword = envOr('SEED_DEMO_PASSWORD', 'change-me');

  const superAdmin = await upsertUser({
    userId: envOr('SEED_SUPERADMIN_USERID', 'admin'),
    password: envOr('SEED_SUPERADMIN_PASSWORD', demoPassword),
    name: envOr('SEED_SUPERADMIN_NAME', 'Super Admin'),
    role: Role.SUPER_ADMIN,
  });

  const consultant = await upsertUser({
    userId: envOr('SEED_CONSULTANT_USERID', 'consultant'),
    password: envOr('SEED_CONSULTANT_PASSWORD', demoPassword),
    name: envOr('SEED_CONSULTANT_NAME', 'Main Consultant'),
    role: Role.CONSULTANT,
  });

  if (!shouldSeedDemoData) {
    console.log('Seed complete with base users only (SEED_DEMO_DATA=false).');
    return;
  }

  const staff = await upsertUser({
    userId: 'staff.ops',
    password: demoPassword,
    name: 'Operations Staff',
    role: Role.STAFF,
    parentId: consultant.id,
    email: 'staff.ops@educonnect.local',
    mobile: '9000000001',
    permissions: ['admissionView', 'admissionAdd', 'admissionEdit', 'expenseAdd'],
  });

  const accounts = await upsertUser({
    userId: 'staff.accounts',
    password: demoPassword,
    name: 'Accounts Staff',
    role: Role.STAFF,
    parentId: consultant.id,
    email: 'staff.accounts@educonnect.local',
    mobile: '9000000002',
    permissions: ['admissionView', 'accountsView', 'reportsView', 'expenseAdd'],
  });

  const agent = await upsertUser({
    userId: 'agent.a',
    password: demoPassword,
    name: 'Rahul Agency',
    role: Role.AGENT,
    parentId: consultant.id,
    email: 'agent.a@educonnect.local',
    mobile: '9000000003',
  });

  await prisma.university.upsert({
    where: { id: 'seed_uni_1' },
    update: {
      name: 'Global Tech University',
      location: 'Pune',
      contactPerson: 'Admissions Desk',
      contactNumber: '020-1000001',
      email: 'admissions@gtu.example',
      address: 'Campus Road, Pune',
      notes: 'Fast offer processing.',
    },
    create: {
      id: 'seed_uni_1',
      name: 'Global Tech University',
      location: 'Pune',
      contactPerson: 'Admissions Desk',
      contactNumber: '020-1000001',
      email: 'admissions@gtu.example',
      address: 'Campus Road, Pune',
      notes: 'Fast offer processing.',
    },
  });

  await prisma.university.upsert({
    where: { id: 'seed_uni_2' },
    update: {
      name: 'City Business School',
      location: 'Bengaluru',
      contactPerson: 'Intake Coordinator',
      contactNumber: '080-1000002',
      email: 'intake@cbs.example',
      address: 'Innovation Hub, Bengaluru',
      notes: 'Strong management intake.',
    },
    create: {
      id: 'seed_uni_2',
      name: 'City Business School',
      location: 'Bengaluru',
      contactPerson: 'Intake Coordinator',
      contactNumber: '080-1000002',
      email: 'intake@cbs.example',
      address: 'Innovation Hub, Bengaluru',
      notes: 'Strong management intake.',
    },
  });

  const courses: SeedCourse[] = [
    {
      id: 'seed_course_1',
      universityId: 'seed_uni_1',
      name: 'MSc Data Science',
      duration: '2 Years',
      type: 'Postgraduate',
      universityFee: 250000,
      displayFee: 320000,
      session: '2026-27',
      notes: 'Industry capstone.',
    },
    {
      id: 'seed_course_2',
      universityId: 'seed_uni_1',
      name: 'BCA Cloud Computing',
      duration: '3 Years',
      type: 'Undergraduate',
      universityFee: 220000,
      displayFee: 280000,
      session: '2026-27',
      notes: 'Cloud labs included.',
    },
    {
      id: 'seed_course_3',
      universityId: 'seed_uni_2',
      name: 'MBA Finance',
      duration: '2 Years',
      type: 'Postgraduate',
      universityFee: 300000,
      displayFee: 380000,
      session: '2026-27',
      notes: 'Corporate finance track.',
    },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { id: course.id },
      update: course,
      create: course,
    });
  }

  const commissionRules: SeedCommissionRule[] = [
    {
      agentId: agent.id,
      courseId: 'seed_course_1',
      type: CommissionType.PERCENT,
      value: 20,
      isActive: true,
    },
    {
      agentId: agent.id,
      courseId: 'seed_course_2',
      type: CommissionType.FLAT,
      value: 12000,
      isActive: true,
    },
  ];

  for (const rule of commissionRules) {
    await prisma.agentCommission.upsert({
      where: {
        agentId_courseId: {
          agentId: rule.agentId,
          courseId: rule.courseId,
        },
      },
      update: {
        type: rule.type,
        value: rule.value,
        isActive: rule.isActive,
      },
      create: rule,
    });
  }

  const courseById = new Map(courses.map((course) => [course.id, course]));
  const commissionByCourse = new Map(commissionRules.map((rule) => [rule.courseId, rule]));

  const admissions: SeedAdmission[] = [
    {
      id: 'seed_adm_1',
      createdById: staff.id,
      consultantId: consultant.id,
      agentId: null,
      courseId: 'seed_course_1',
      source: AdmissionSource.DIRECT,
      status: AdmissionStatus.SUBMITTED,
      createdAt: daysAgo(24),
      studentName: 'Aarav Sharma',
      fatherName: 'Rakesh Sharma',
      mobile: '9000100001',
      altMobile: '9000200001',
      address: 'Baner, Pune',
      dob: new Date('2002-05-13'),
      gender: 'Male',
      photoUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=512',
      studentDocumentUrl: 'https://example.com/docs/seed_adm_1-id.pdf',
      amountReceived: 315000,
      agentExpense: 0,
      consultancyExpense: 1800,
      universityPaid: 180000,
      agentPaid: 0,
    },
    {
      id: 'seed_adm_2',
      createdById: consultant.id,
      consultantId: consultant.id,
      agentId: agent.id,
      courseId: 'seed_course_1',
      source: AdmissionSource.AGENT,
      status: AdmissionStatus.SUBMITTED,
      createdAt: daysAgo(14),
      studentName: 'Neha Gupta',
      fatherName: 'Ramesh Gupta',
      mobile: '9000100002',
      altMobile: '9000200002',
      address: 'Wakad, Pune',
      dob: new Date('2004-11-29'),
      gender: 'Female',
      photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=512',
      studentDocumentUrl: 'https://example.com/docs/seed_adm_2-id.pdf',
      amountReceived: 318000,
      agentExpense: 2200,
      consultancyExpense: 1400,
      universityPaid: 250000,
      agentPaid: 9000,
    },
    {
      id: 'seed_adm_3',
      createdById: staff.id,
      consultantId: consultant.id,
      agentId: agent.id,
      courseId: 'seed_course_2',
      source: AdmissionSource.AGENT,
      status: AdmissionStatus.SUBMITTED,
      createdAt: daysAgo(6),
      studentName: 'Karan Malhotra',
      fatherName: 'Pradeep Malhotra',
      mobile: '9000100003',
      altMobile: '9000200003',
      address: 'Koregaon Park, Pune',
      dob: new Date('2003-02-08'),
      gender: 'Male',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=512',
      studentDocumentUrl: 'https://example.com/docs/seed_adm_3-id.pdf',
      amountReceived: 275000,
      agentExpense: 1500,
      consultancyExpense: 1200,
      universityPaid: 120000,
      agentPaid: 6000,
    },
    {
      id: 'seed_adm_4',
      createdById: consultant.id,
      consultantId: consultant.id,
      agentId: null,
      courseId: 'seed_course_3',
      source: AdmissionSource.DIRECT,
      status: AdmissionStatus.DRAFT,
      createdAt: daysAgo(2),
      studentName: 'Riya Sen',
      fatherName: 'Amit Sen',
      mobile: '9000100004',
      altMobile: '9000200004',
      address: 'Koramangala, Bengaluru',
      dob: new Date('2005-08-16'),
      gender: 'Female',
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=512',
      studentDocumentUrl: 'https://example.com/docs/seed_adm_4-id.pdf',
      amountReceived: 370000,
      agentExpense: 0,
      consultancyExpense: 900,
      universityPaid: 0,
      agentPaid: 0,
    },
  ];

  for (const admissionInput of admissions) {
    const course = courseById.get(admissionInput.courseId);
    if (!course) {
      throw new Error(`Missing course in seed map: ${admissionInput.courseId}`);
    }

    const consultancyProfit = clampNonNegativeInt(
      admissionInput.amountReceived - course.universityFee
    );

    const commission = calculateCommission(
      admissionInput.agentId ? commissionByCourse.get(admissionInput.courseId) : undefined,
      consultancyProfit
    );

    const agentExpensesTotal = clampNonNegativeInt(admissionInput.agentExpense);
    const consultancyExpensesTotal = clampNonNegativeInt(admissionInput.consultancyExpense);
    const netProfit = clampNonNegativeInt(
      consultancyProfit - commission.amount - agentExpensesTotal - consultancyExpensesTotal
    );

    const admission = await prisma.admission.upsert({
      where: { id: admissionInput.id },
      update: {
        createdById: admissionInput.createdById,
        consultantId: admissionInput.consultantId,
        agentId: admissionInput.agentId,
        status: admissionInput.status,
        submittedAt:
          admissionInput.status === AdmissionStatus.SUBMITTED
            ? addHours(admissionInput.createdAt, 1)
            : null,
        studentName: admissionInput.studentName,
        fatherName: admissionInput.fatherName,
        mobile: admissionInput.mobile,
        altMobile: admissionInput.altMobile,
        address: admissionInput.address,
        dob: admissionInput.dob,
        gender: admissionInput.gender,
        photoUrl: admissionInput.photoUrl,
        documents: {
          photo: admissionInput.photoUrl,
          files: [admissionInput.studentDocumentUrl],
        },
        universityId: course.universityId,
        courseId: course.id,
        admissionSession: course.session,
        amountReceived: admissionInput.amountReceived,
        source: admissionInput.source,
        universityFee: course.universityFee,
        displayFee: course.displayFee,
        consultancyProfit,
        agentCommissionType: commission.type,
        agentCommissionValue: commission.value,
        agentCommissionAmount: commission.amount,
        agentExpensesTotal,
        consultancyExpensesTotal,
        netProfit,
      },
      create: {
        id: admissionInput.id,
        createdById: admissionInput.createdById,
        consultantId: admissionInput.consultantId,
        agentId: admissionInput.agentId,
        status: admissionInput.status,
        submittedAt:
          admissionInput.status === AdmissionStatus.SUBMITTED
            ? addHours(admissionInput.createdAt, 1)
            : null,
        createdAt: admissionInput.createdAt,
        studentName: admissionInput.studentName,
        fatherName: admissionInput.fatherName,
        mobile: admissionInput.mobile,
        altMobile: admissionInput.altMobile,
        address: admissionInput.address,
        dob: admissionInput.dob,
        gender: admissionInput.gender,
        photoUrl: admissionInput.photoUrl,
        documents: {
          photo: admissionInput.photoUrl,
          files: [admissionInput.studentDocumentUrl],
        },
        universityId: course.universityId,
        courseId: course.id,
        admissionSession: course.session,
        amountReceived: admissionInput.amountReceived,
        source: admissionInput.source,
        universityFee: course.universityFee,
        displayFee: course.displayFee,
        consultancyProfit,
        agentCommissionType: commission.type,
        agentCommissionValue: commission.value,
        agentCommissionAmount: commission.amount,
        agentExpensesTotal,
        consultancyExpensesTotal,
        netProfit,
      },
    });

    await prisma.admissionDocument.upsert({
      where: { id: `${admissionInput.id}_photo` },
      update: {
        admissionId: admission.id,
        kind: DocumentKind.PHOTO,
        label: 'Student Photo',
        fileName: `${admissionInput.id}-photo.jpg`,
        mimeType: 'image/jpeg',
        url: admissionInput.photoUrl,
        uploadedById: admissionInput.createdById,
      },
      create: {
        id: `${admissionInput.id}_photo`,
        admissionId: admission.id,
        kind: DocumentKind.PHOTO,
        label: 'Student Photo',
        fileName: `${admissionInput.id}-photo.jpg`,
        mimeType: 'image/jpeg',
        url: admissionInput.photoUrl,
        uploadedById: admissionInput.createdById,
      },
    });

    await prisma.admissionDocument.upsert({
      where: { id: `${admissionInput.id}_student_doc` },
      update: {
        admissionId: admission.id,
        kind: DocumentKind.STUDENT_DOCUMENT,
        label: 'Student Document',
        fileName: `${admissionInput.id}-document.pdf`,
        mimeType: 'application/pdf',
        url: admissionInput.studentDocumentUrl,
        uploadedById: admissionInput.createdById,
      },
      create: {
        id: `${admissionInput.id}_student_doc`,
        admissionId: admission.id,
        kind: DocumentKind.STUDENT_DOCUMENT,
        label: 'Student Document',
        fileName: `${admissionInput.id}-document.pdf`,
        mimeType: 'application/pdf',
        url: admissionInput.studentDocumentUrl,
        uploadedById: admissionInput.createdById,
      },
    });

    await prisma.admissionChange.upsert({
      where: { id: `${admissionInput.id}_created` },
      update: {
        admissionId: admission.id,
        actorId: admissionInput.createdById,
        action: 'ADMISSION_CREATED',
        details: { source: 'seed' },
      },
      create: {
        id: `${admissionInput.id}_created`,
        admissionId: admission.id,
        actorId: admissionInput.createdById,
        action: 'ADMISSION_CREATED',
        details: { source: 'seed' },
      },
    });

    if (admissionInput.status === AdmissionStatus.SUBMITTED) {
      await prisma.admissionChange.upsert({
        where: { id: `${admissionInput.id}_submitted` },
        update: {
          admissionId: admission.id,
          actorId: admissionInput.createdById,
          action: 'ADMISSION_SUBMITTED',
          details: { source: 'seed' },
        },
        create: {
          id: `${admissionInput.id}_submitted`,
          admissionId: admission.id,
          actorId: admissionInput.createdById,
          action: 'ADMISSION_SUBMITTED',
          details: { source: 'seed' },
        },
      });
    } else {
      await prisma.admissionChange.deleteMany({ where: { id: `${admissionInput.id}_submitted` } });
    }

    const agentExpenseId = `${admissionInput.id}_agent_expense`;
    if (agentExpensesTotal > 0) {
      await prisma.expense.upsert({
        where: { id: agentExpenseId },
        update: {
          type: ExpenseType.AGENT,
          title: 'Agent coordination expense',
          amount: agentExpensesTotal,
          proofUrl: `https://example.com/proofs/${agentExpenseId}.jpg`,
          date: addHours(admissionInput.createdAt, 4),
          admissionId: admission.id,
          createdById: admissionInput.createdById,
        },
        create: {
          id: agentExpenseId,
          type: ExpenseType.AGENT,
          title: 'Agent coordination expense',
          amount: agentExpensesTotal,
          proofUrl: `https://example.com/proofs/${agentExpenseId}.jpg`,
          date: addHours(admissionInput.createdAt, 4),
          admissionId: admission.id,
          createdById: admissionInput.createdById,
        },
      });
    } else {
      await prisma.expense.deleteMany({ where: { id: agentExpenseId } });
    }

    const consultancyExpenseId = `${admissionInput.id}_consultancy_expense`;
    if (consultancyExpensesTotal > 0) {
      await prisma.expense.upsert({
        where: { id: consultancyExpenseId },
        update: {
          type: ExpenseType.CONSULTANCY,
          title: 'Consultancy processing expense',
          amount: consultancyExpensesTotal,
          proofUrl: `https://example.com/proofs/${consultancyExpenseId}.jpg`,
          date: addHours(admissionInput.createdAt, 5),
          admissionId: admission.id,
          createdById: admissionInput.createdById,
        },
        create: {
          id: consultancyExpenseId,
          type: ExpenseType.CONSULTANCY,
          title: 'Consultancy processing expense',
          amount: consultancyExpensesTotal,
          proofUrl: `https://example.com/proofs/${consultancyExpenseId}.jpg`,
          date: addHours(admissionInput.createdAt, 5),
          admissionId: admission.id,
          createdById: admissionInput.createdById,
        },
      });
    } else {
      await prisma.expense.deleteMany({ where: { id: consultancyExpenseId } });
    }

    if (admissionInput.status !== AdmissionStatus.SUBMITTED) {
      await prisma.universityLedger.deleteMany({ where: { admissionId: admission.id } });
      await prisma.agentLedger.deleteMany({ where: { admissionId: admission.id } });
      await prisma.profitLedger.deleteMany({ where: { admissionId: admission.id } });
      await prisma.universityPayment.deleteMany({ where: { id: `${admissionInput.id}_uni_payment_1` } });
      await prisma.agentPayout.deleteMany({ where: { id: `${admissionInput.id}_agent_payout_1` } });
      continue;
    }

    const paidToUniversity = Math.min(admissionInput.universityPaid, course.universityFee);
    const universityLedger = await prisma.universityLedger.upsert({
      where: { admissionId: admission.id },
      update: {
        universityId: course.universityId,
        amountPayable: course.universityFee,
        amountPaid: paidToUniversity,
        status: paidToUniversity >= course.universityFee ? PaymentStatus.PAID : PaymentStatus.PENDING,
      },
      create: {
        admissionId: admission.id,
        universityId: course.universityId,
        amountPayable: course.universityFee,
        amountPaid: paidToUniversity,
        status: paidToUniversity >= course.universityFee ? PaymentStatus.PAID : PaymentStatus.PENDING,
      },
    });

    if (paidToUniversity > 0) {
      await prisma.universityPayment.upsert({
        where: { id: `${admissionInput.id}_uni_payment_1` },
        update: {
          ledgerId: universityLedger.id,
          amount: paidToUniversity,
          paidAt: addHours(admissionInput.createdAt, 48),
          method: PaymentMethod.BANK_TRANSFER,
          reference: `UPI-${admissionInput.id.toUpperCase()}`,
          proofUrl: `https://example.com/proofs/${admissionInput.id}-uni-payment.jpg`,
          notes: 'Seeded university payment',
          createdById: accounts.id,
        },
        create: {
          id: `${admissionInput.id}_uni_payment_1`,
          ledgerId: universityLedger.id,
          amount: paidToUniversity,
          paidAt: addHours(admissionInput.createdAt, 48),
          method: PaymentMethod.BANK_TRANSFER,
          reference: `UPI-${admissionInput.id.toUpperCase()}`,
          proofUrl: `https://example.com/proofs/${admissionInput.id}-uni-payment.jpg`,
          notes: 'Seeded university payment',
          createdById: accounts.id,
        },
      });
    } else {
      await prisma.universityPayment.deleteMany({ where: { id: `${admissionInput.id}_uni_payment_1` } });
    }

    await prisma.profitLedger.upsert({
      where: { admissionId: admission.id },
      update: {
        grossProfit: consultancyProfit,
        agentCommission: commission.amount,
        agentExpenses: agentExpensesTotal,
        consultancyExpenses: consultancyExpensesTotal,
        netProfit,
      },
      create: {
        admissionId: admission.id,
        grossProfit: consultancyProfit,
        agentCommission: commission.amount,
        agentExpenses: agentExpensesTotal,
        consultancyExpenses: consultancyExpensesTotal,
        netProfit,
      },
    });

    if (admissionInput.agentId) {
      const paidToAgent = Math.min(admissionInput.agentPaid, commission.amount);
      const agentLedger = await prisma.agentLedger.upsert({
        where: { admissionId: admission.id },
        update: {
          agentId: admissionInput.agentId,
          commissionAmount: commission.amount,
          amountPaid: paidToAgent,
          status: paidToAgent >= commission.amount ? PaymentStatus.PAID : PaymentStatus.PENDING,
        },
        create: {
          admissionId: admission.id,
          agentId: admissionInput.agentId,
          commissionAmount: commission.amount,
          amountPaid: paidToAgent,
          status: paidToAgent >= commission.amount ? PaymentStatus.PAID : PaymentStatus.PENDING,
        },
      });

      if (paidToAgent > 0) {
        await prisma.agentPayout.upsert({
          where: { id: `${admissionInput.id}_agent_payout_1` },
          update: {
            ledgerId: agentLedger.id,
            amount: paidToAgent,
            paidAt: addHours(admissionInput.createdAt, 72),
            method: PaymentMethod.UPI,
            reference: `AGENT-${admissionInput.id.toUpperCase()}`,
            proofUrl: `https://example.com/proofs/${admissionInput.id}-agent-payout.jpg`,
            notes: 'Seeded agent payout',
            createdById: accounts.id,
          },
          create: {
            id: `${admissionInput.id}_agent_payout_1`,
            ledgerId: agentLedger.id,
            amount: paidToAgent,
            paidAt: addHours(admissionInput.createdAt, 72),
            method: PaymentMethod.UPI,
            reference: `AGENT-${admissionInput.id.toUpperCase()}`,
            proofUrl: `https://example.com/proofs/${admissionInput.id}-agent-payout.jpg`,
            notes: 'Seeded agent payout',
            createdById: accounts.id,
          },
        });
      } else {
        await prisma.agentPayout.deleteMany({ where: { id: `${admissionInput.id}_agent_payout_1` } });
      }
    } else {
      await prisma.agentLedger.deleteMany({ where: { admissionId: admission.id } });
      await prisma.agentPayout.deleteMany({ where: { id: `${admissionInput.id}_agent_payout_1` } });
    }
  }

  await prisma.expense.upsert({
    where: { id: 'seed_daily_expense_1' },
    update: {
      type: ExpenseType.DAILY,
      category: ExpenseCategory.RENT,
      title: 'Office rent',
      amount: 35000,
      date: daysAgo(10),
      proofUrl: 'https://example.com/proofs/seed-daily-rent.jpg',
      createdById: accounts.id,
      admissionId: null,
    },
    create: {
      id: 'seed_daily_expense_1',
      type: ExpenseType.DAILY,
      category: ExpenseCategory.RENT,
      title: 'Office rent',
      amount: 35000,
      date: daysAgo(10),
      proofUrl: 'https://example.com/proofs/seed-daily-rent.jpg',
      createdById: accounts.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'seed_lead_1' },
    update: {
      name: 'Mentor Clock',
      email: 'mentorclock.com@gmail.com',
      phone: '9000300001',
      company: 'Mentor Clock',
      message: 'Need full admissions and ledger CRM demo.',
      source: 'website_contact',
      pageUrl: '/contact',
      ipHash: 'seed-ip-1',
      userAgent: 'seed-script',
      createdAt: daysAgo(5),
    },
    create: {
      id: 'seed_lead_1',
      name: 'Mentor Clock',
      email: 'mentorclock.com@gmail.com',
      phone: '9000300001',
      company: 'Mentor Clock',
      message: 'Need full admissions and ledger CRM demo.',
      source: 'website_contact',
      pageUrl: '/contact',
      ipHash: 'seed-ip-1',
      userAgent: 'seed-script',
      createdAt: daysAgo(5),
    },
  });

  await prisma.poster.upsert({
    where: { id: 'seed_poster_1' },
    update: {
      title: 'Data Science 2026 Intake',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200',
      qrTargetPath: '/contact',
      tags: ['data-science', 'pg', 'pune'],
      isActive: true,
      universityId: 'seed_uni_1',
      courseId: 'seed_course_1',
      createdById: superAdmin.id,
    },
    create: {
      id: 'seed_poster_1',
      title: 'Data Science 2026 Intake',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200',
      qrTargetPath: '/contact',
      tags: ['data-science', 'pg', 'pune'],
      isActive: true,
      universityId: 'seed_uni_1',
      courseId: 'seed_course_1',
      createdById: superAdmin.id,
    },
  });

  await prisma.auditLog.upsert({
    where: { id: 'seed_audit_1' },
    update: {
      actorId: superAdmin.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: superAdmin.id,
      success: true,
      metadata: { source: 'seed' },
      createdAt: daysAgo(1),
    },
    create: {
      id: 'seed_audit_1',
      actorId: superAdmin.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: superAdmin.id,
      success: true,
      metadata: { source: 'seed' },
      createdAt: daysAgo(1),
    },
  });

  await prisma.auditLog.upsert({
    where: { id: 'seed_audit_2' },
    update: {
      actorId: accounts.id,
      action: 'UNIVERSITY_PAYMENT_RECORDED',
      entityType: 'UniversityPayment',
      entityId: 'seed_adm_2_uni_payment_1',
      success: true,
      metadata: { source: 'seed' },
      createdAt: daysAgo(3),
    },
    create: {
      id: 'seed_audit_2',
      actorId: accounts.id,
      action: 'UNIVERSITY_PAYMENT_RECORDED',
      entityType: 'UniversityPayment',
      entityId: 'seed_adm_2_uni_payment_1',
      success: true,
      metadata: { source: 'seed' },
      createdAt: daysAgo(3),
    },
  });

  console.log('Seed complete: realistic demo records created successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
