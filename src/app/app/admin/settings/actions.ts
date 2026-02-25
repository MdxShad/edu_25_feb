'use server';

import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PDF_TERM_SETTING_KEYS, parseTerms, serializeTerms } from '@/lib/pdf/terms';
import { BRAND_SETTING_KEYS } from '@/lib/branding';
import { setMonthClosedUpTo } from '@/lib/month-close';

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



export async function saveBrandSettingsAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const consultancyName = String(formData.get('consultancyName') ?? '').trim();
  if (!consultancyName) throw new Error('Consultancy name is required');

  const consultancyPhone = String(formData.get('consultancyPhone') ?? '').trim();
  const consultancyEmail = String(formData.get('consultancyEmail') ?? '').trim();
  const consultancyAddress = String(formData.get('consultancyAddress') ?? '').trim();
  const manualLogoUrl = String(formData.get('consultancyLogoUrl') ?? '').trim();
  const uploadedLogoUrl = String(formData.get('consultancyLogoFileUrl') ?? '').trim();
  const consultancyLogoUrl = uploadedLogoUrl || manualLogoUrl;

  const updates = [
    { key: BRAND_SETTING_KEYS.name, value: consultancyName },
    { key: BRAND_SETTING_KEYS.phone, value: consultancyPhone },
    { key: BRAND_SETTING_KEYS.email, value: consultancyEmail },
    { key: BRAND_SETTING_KEYS.address, value: consultancyAddress },
    { key: BRAND_SETTING_KEYS.logoUrl, value: consultancyLogoUrl },
  ];

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
  revalidatePath('/app/posters');
}

export async function closeMonthAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);
  const month = String(formData.get('month') ?? '').trim();
  if (!month) throw new Error('Month is required');
  const [year, mm] = month.split('-').map((v) => Number(v));
  if (!year || !mm) throw new Error('Invalid month');
  const closedUpTo = new Date(Date.UTC(year, mm, 0, 23, 59, 59, 999));
  await setMonthClosedUpTo(closedUpTo.toISOString());
  revalidatePath('/app/admin/settings');
}
