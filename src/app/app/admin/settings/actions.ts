'use server';

import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PDF_TERM_SETTING_KEYS, parseTerms, serializeTerms } from '@/lib/pdf/terms';

const fieldToSetting = {
  admissionSlipTerms: PDF_TERM_SETTING_KEYS.admissionSlip,
  feeReceiptTerms: PDF_TERM_SETTING_KEYS.feeReceipt,
  universityPaymentTerms: PDF_TERM_SETTING_KEYS.universityPayment,
  agentPayoutTerms: PDF_TERM_SETTING_KEYS.agentPayout,
  reportTerms: PDF_TERM_SETTING_KEYS.report,
} as const;

type FormFieldName = keyof typeof fieldToSetting;

function normalizeValue(input: FormDataEntryValue | null): string {
  const raw = String(input ?? '');
  const lines = parseTerms(raw) ?? [];
  return serializeTerms(lines);
}

export async function savePdfTermsAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const updates = (Object.keys(fieldToSetting) as FormFieldName[]).map((field) => ({
    key: fieldToSetting[field],
    value: normalizeValue(formData.get(field)),
  }));

  await prisma.$transaction(
    updates.map((item) =>
      prisma.appSetting.upsert({
        where: { key: item.key },
        create: { key: item.key, value: item.value },
        update: { value: item.value },
      })
    )
  );

  revalidatePath('/app/admin/settings');
}

