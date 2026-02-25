import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url;

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/services',
          '/contact',
          '/privacy-policy',
          '/terms',
          '/refund-policy',
          '/cookies-policy',
          '/security',
        ],
        disallow: ['/app', '/api', '/login'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
