import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import '../styles/globals.css';
import { Toaster } from '@/components/ui/toaster';
import { siteConfig, getSiteBrandName } from '@/lib/site';
import { ensureEnv } from '@/lib/env';

ensureEnv();

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const brandName = await getSiteBrandName();
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: brandName,
      template: `%s | ${brandName}`,
    },
    description: siteConfig.description,
    openGraph: {
      title: brandName,
      description: siteConfig.description,
      url: siteConfig.url,
      siteName: brandName,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: brandName,
      description: siteConfig.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} font-[var(--font-manrope)]`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
