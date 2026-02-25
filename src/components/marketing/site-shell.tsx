import Link from 'next/link';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
  { href: '/security', label: 'Security' },
];

export function MarketingShell({
  children,
  brand,
}: {
  children: ReactNode;
  brand: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}) {
  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight no-underline">
            {brand.name}
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-700 hover:text-zinc-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Button asChild size="sm">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-20 border-t border-zinc-200 bg-white/80">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{brand.name}</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Internal consultancy CRM for admissions, finance tracking, and agent operations.
              </p>
              {brand.phone || brand.email || brand.address ? (
                <div className="mt-3 space-y-1 text-xs text-zinc-600">
                  {brand.phone ? <div>Phone: {brand.phone}</div> : null}
                  {brand.email ? <div>Email: {brand.email}</div> : null}
                  {brand.address ? <div>{brand.address}</div> : null}
                </div>
              ) : null}
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Company
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-zinc-600">
                <li>
                  <Link href="/about">About</Link>
                </li>
                <li>
                  <Link href="/services">Services</Link>
                </li>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Legal</h3>
              <ul className="mt-2 space-y-2 text-sm text-zinc-600">
                <li>
                  <Link href="/privacy-policy">Privacy Policy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms</Link>
                </li>
                <li>
                  <Link href="/refund-policy">Refund Policy</Link>
                </li>
                <li>
                  <Link href="/cookies-policy">Cookies Policy</Link>
                </li>
              </ul>
            </div>
          </div>
          <Separator className="my-6" />
          <p className="text-xs text-zinc-500">
            {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
