import { DEFAULT_BRAND_NAME, getBrandSettings } from '@/lib/branding';

export const siteConfig = {
  name: DEFAULT_BRAND_NAME,
  description: 'Internal consultancy CRM for admissions, accounting, and role-based operations.',
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000',
};

export async function getSiteBrandName(): Promise<string> {
  const brand = await getBrandSettings();
  return brand.name || siteConfig.name;
}

export const marketingRoutes = [
  '/',
  '/about',
  '/services',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/refund-policy',
  '/cookies-policy',
  '/security',
] as const;
