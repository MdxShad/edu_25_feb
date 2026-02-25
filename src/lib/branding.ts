import { prisma } from '@/lib/db';

export const BRAND_SETTING_KEYS = {
  name: 'CONSULTANCY_NAME',
  phone: 'CONSULTANCY_PHONE',
  email: 'CONSULTANCY_EMAIL',
  address: 'CONSULTANCY_ADDRESS',
  logoUrl: 'CONSULTANCY_LOGO_URL',
} as const;

export type BrandSettings = {
  name: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
};

export const DEFAULT_BRAND_NAME = 'EduConnect CRM';

export async function getBrandSettings(): Promise<BrandSettings> {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: Object.values(BRAND_SETTING_KEYS) } },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));

    return {
      name: (byKey.get(BRAND_SETTING_KEYS.name) || DEFAULT_BRAND_NAME).trim() || DEFAULT_BRAND_NAME,
      phone: (byKey.get(BRAND_SETTING_KEYS.phone) || '').trim(),
      email: (byKey.get(BRAND_SETTING_KEYS.email) || '').trim(),
      address: (byKey.get(BRAND_SETTING_KEYS.address) || '').trim(),
      logoUrl: (byKey.get(BRAND_SETTING_KEYS.logoUrl) || '').trim(),
    };
  } catch {
    return {
      name: DEFAULT_BRAND_NAME,
      phone: '',
      email: '',
      address: '',
      logoUrl: '',
    };
  }
}
