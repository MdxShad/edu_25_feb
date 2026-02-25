import { z } from 'zod';
import { AdmissionSource, CommissionType, ExpenseCategory, LeadStatus, PaymentMethod } from '@prisma/client';


const phoneRegex = /^\+?[0-9][0-9\s-]{7,14}$/;

const phoneSchema = z
  .string()
  .trim()
  .min(8, 'Mobile number is too short.')
  .max(20, 'Mobile number is too long.')
  .regex(phoneRegex, 'Enter a valid mobile number.');

const optionalPhoneSchema = z.union([z.literal(''), phoneSchema]).optional();

export const loginSchema = z.object({
  userId: z.string().min(2).max(50),
  password: z.string().min(4).max(100),
});

export const universitySchema = z.object({
  name: z.string().min(2).max(200),
  location: z.string().max(200).optional().or(z.literal('')),
  contactPerson: z.string().max(200).optional().or(z.literal('')),
  contactNumber: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export const courseSchema = z
  .object({
    universityId: z.string().min(1),
    name: z.string().min(2).max(200),
    duration: z.string().max(100).optional().or(z.literal('')),
    type: z.string().max(100).optional().or(z.literal('')),
    universityFee: z.coerce.number().int().nonnegative(),
    displayFee: z.coerce.number().int().nonnegative(),
    session: z.string().max(100).optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    if (value.displayFee < value.universityFee) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Display fee must be greater than or equal to university fee.',
        path: ['displayFee'],
      });
    }
  });

export const uploadedFileSchema = z.object({
  url: z.string().url(),
  fileName: z.string().max(260).optional().or(z.literal('')),
  mimeType: z.string().max(120).optional().or(z.literal('')),
  sizeBytes: z.coerce.number().int().nonnegative().optional(),
});

export const createAgentSchema = z.object({
  userId: z.string().min(2).max(50),
  password: z.string().min(4).max(100),
  name: z.string().min(2).max(200),
  mobile: optionalPhoneSchema,
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  idProofUrl: z.string().url().optional().or(z.literal('')),
  idProofFile: uploadedFileSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

export const agentCommissionSchema = z.object({
  agentId: z.string().min(1),
  courseId: z.string().min(1),
  type: z.nativeEnum(CommissionType),
  value: z.coerce.number().int().nonnegative(),
  isActive: z.coerce.boolean().optional().default(true),
});

export const createStaffSchema = z.object({
  userId: z.string().min(2).max(50),
  password: z.string().min(4).max(100),
  name: z.string().min(2).max(200),
  parentConsultantId: z.string().optional().or(z.literal('')),
  permissions: z.array(z.string()).default([]),
});

export const admissionExpenseSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.coerce.number().int().nonnegative(),
  proofUrl: z.string().url().optional().or(z.literal('')),
  proofFile: uploadedFileSchema.optional(),
});

export const createAdmissionSchema = z.object({
  consultantId: z.string().optional().or(z.literal('')),

  // Step 1
  studentName: z.string().min(2).max(200),
  fatherName: z.string().max(200).optional().or(z.literal('')),
  mobile: phoneSchema,
  altMobile: optionalPhoneSchema,
  address: z.string().max(500).optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  gender: z.string().max(50).optional().or(z.literal('')),
  photoUrl: z.string().url().optional().or(z.literal('')),
  photoFile: uploadedFileSchema.optional(),
  documents: z.array(uploadedFileSchema).optional().default([]),

  // Step 2
  universityId: z.string().min(1),
  courseId: z.string().min(1),
  admissionSession: z.string().min(3).max(100),

  // Step 3
  amountReceived: z.coerce.number().int().nonnegative(),

  // Step 4
  source: z.nativeEnum(AdmissionSource),
  agentId: z.string().optional().or(z.literal('')),

  // Step 5
  agentExpenses: z.array(admissionExpenseSchema).default([]),
  consultancyExpenses: z.array(admissionExpenseSchema).default([]),
});

export const updateAdmissionContactSchema = z.object({
  admissionId: z.string().min(1),
  mobile: phoneSchema,
  altMobile: optionalPhoneSchema,
  address: z.string().max(500).optional().or(z.literal('')),
});

export const dailyExpenseSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.coerce.number().int().nonnegative(),
  date: z.string().optional().or(z.literal('')),
  proofUrl: z.string().url().optional().or(z.literal('')),
  proofFileName: z.string().max(260).optional().or(z.literal('')),
  proofMimeType: z.string().max(120).optional().or(z.literal('')),
  proofSizeBytes: z.coerce.number().int().nonnegative().optional(),
  proofFile: uploadedFileSchema.optional(),
});

export const ledgerPaymentSchema = z.object({
  amount: z.coerce.number().int().positive(),
  paidAt: z.string().optional().or(z.literal('')),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().max(120).optional().or(z.literal('')),
  proofUrl: z.string().url().optional().or(z.literal('')),
  proofFileName: z.string().max(260).optional().or(z.literal('')),
  proofMimeType: z.string().max(120).optional().or(z.literal('')),
  proofSizeBytes: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const createPosterSchema = z.object({
  title: z.string().min(2).max(140),
  imageUrl: z.string().url().optional().or(z.literal('')),
  imageFile: uploadedFileSchema.optional(),
  universityId: z.string().optional().or(z.literal('')),
  courseId: z.string().optional().or(z.literal('')),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  qrTargetPath: z.enum(['/', '/contact']).default('/contact'),
  isActive: z.coerce.boolean().optional().default(true),
});

export const posterStatusSchema = z.object({
  posterId: z.string().min(1),
  isActive: z.coerce.boolean(),
});

export const aiAdmissionSummarySchema = z.object({
  admissionId: z.string().min(1),
});

export const aiReminderSchema = z.object({
  maxRows: z.coerce.number().int().min(1).max(20).default(5),
});

export const aiPosterCaptionSchema = z.object({
  topic: z.string().min(3).max(160),
});


export const studentPaymentSchema = z.object({
  amount: z.coerce.number().int().positive(),
  paidAt: z.string().optional().or(z.literal('')),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().max(120).optional().or(z.literal('')),
  proofUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const updateLeadSchema = z.object({
  leadId: z.string().min(1),
  status: z.nativeEnum(LeadStatus),
  assignedToId: z.string().optional().or(z.literal('')),
  internalNotes: z.string().max(2000).optional().or(z.literal('')),
});

export const contactLeadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(30).optional().or(z.literal('')),
  company: z.string().max(120).optional().or(z.literal('')),
  message: z.string().min(10).max(2000),
  source: z.string().max(120).optional().or(z.literal('')),
  pageUrl: z.string().max(400).optional().or(z.literal('')),
  website: z.string().max(0).optional().or(z.literal('')),
});
