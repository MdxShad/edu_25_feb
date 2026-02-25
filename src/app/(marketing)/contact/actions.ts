'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIpFromForwarded, hashValue } from '@/lib/security';
import { contactLeadSchema } from '@/lib/validation';
import { logAuditEvent } from '@/lib/audit';

export type ContactLeadState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

const SUCCESS_MESSAGE = 'Thanks for reaching out. Our team will contact you soon.';

export async function submitContactLeadAction(
  _prev: ContactLeadState,
  formData: FormData
): Promise<ContactLeadState> {
  const raw = {
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    company: String(formData.get('company') ?? '').trim(),
    message: String(formData.get('message') ?? '').trim(),
    source: String(formData.get('source') ?? '').trim(),
    pageUrl: String(formData.get('pageUrl') ?? '').trim(),
    website: String(formData.get('website') ?? '').trim(),
  };

  // Honeypot trap. Return success to avoid revealing bot detection behavior.
  if (raw.website.length > 0) {
    return { ok: true, message: SUCCESS_MESSAGE };
  }

  const parsed = contactLeadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Please correct the highlighted fields and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const headerStore = headers();
  const ip =
    getClientIpFromForwarded(headerStore.get('x-forwarded-for')) ||
    headerStore.get('x-real-ip') ||
    'unknown';

  const ipHash = hashValue(ip);
  const emailKey = hashValue(parsed.data.email.toLowerCase());

  const ipRateLimit = checkRateLimit({
    key: `contact:ip:${ipHash}`,
    limit: 4,
    windowMs: 10 * 60 * 1000,
  });
  const emailRateLimit = checkRateLimit({
    key: `contact:email:${emailKey}`,
    limit: 2,
    windowMs: 10 * 60 * 1000,
  });

  if (!ipRateLimit.allowed || !emailRateLimit.allowed) {
    await logAuditEvent({
      action: 'CONTACT_FORM_RATE_LIMITED',
      success: false,
      entityType: 'Lead',
      metadata: { email: parsed.data.email.toLowerCase() },
      ipHash,
      userAgent: headerStore.get('user-agent'),
    });
    return {
      ok: false,
      message: 'Too many submissions. Please wait a few minutes and try again.',
    };
  }

  await prisma.lead.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      message: parsed.data.message,
      source: parsed.data.source || 'marketing-contact-form',
      pageUrl: parsed.data.pageUrl || null,
      ipHash,
      userAgent: headerStore.get('user-agent') || null,
    },
  });

  await logAuditEvent({
    action: 'CONTACT_FORM_SUBMITTED',
    success: true,
    entityType: 'Lead',
    metadata: { email: parsed.data.email.toLowerCase(), source: parsed.data.source || null },
    ipHash,
    userAgent: headerStore.get('user-agent'),
  });

  revalidatePath('/contact');
  return { ok: true, message: SUCCESS_MESSAGE };
}
