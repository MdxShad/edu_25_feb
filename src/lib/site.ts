export const siteConfig = {
  name: 'EduConnect CRM',
  description: 'Internal consultancy CRM for admissions, accounting, and role-based operations.',
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000',
};

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
