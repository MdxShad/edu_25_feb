import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/site-shell';
import { getBrandSettings } from '@/lib/branding';

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandSettings();
  return {
    title: {
      default: brand.name,
      template: `%s | ${brand.name}`,
    },
  };
}

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrandSettings();

  return (
    <MarketingShell
      brand={{
        name: brand.name,
        phone: brand.phone,
        email: brand.email,
        address: brand.address,
      }}
    >
      {children}
    </MarketingShell>
  );
}
