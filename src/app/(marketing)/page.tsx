import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, Building2, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'EduConnect CRM | Admissions and Consultancy Management',
  description:
    'Secure internal CRM for education consultancies with admissions, accounting, agent commissions, and role-based operations.',
  openGraph: {
    title: 'EduConnect CRM',
    description:
      'Secure internal CRM for education consultancies with admissions, accounting, and agent commission workflows.',
    url: '/',
    type: 'website',
  },
};

const modules = [
  {
    icon: Building2,
    title: 'University and course control',
    description:
      'Manage universities, courses, fees, sessions, and notes with admin-only controls.',
  },
  {
    icon: Users,
    title: 'Agent and staff operations',
    description:
      'Role-based access for super admin, consultant, staff, and view-only agent workflows.',
  },
  {
    icon: BarChart3,
    title: 'Accounting and profitability',
    description:
      'Track university payable, agent commission, expenses, and final net profit per admission.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit-ready internal security',
    description:
      'Direct login, no public signup, restricted modules, and permission-based action enforcement.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8 lg:pt-24">
          <div>
            <p className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-800">
              Internal CRM for education consultancies
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl">
              Convert admissions into a controlled, profitable process.
            </h1>
            <p className="mt-5 max-w-xl text-base text-zinc-600 sm:text-lg">
              EduConnect CRM centralizes admissions, agent commissions, university payouts, and
              consultancy profit tracking in one secure system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login" className="gap-2 no-underline">
                  Open CRM
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/contact" className="no-underline">
                  Talk to sales
                </Link>
              </Button>
            </div>
          </div>

          <Card className="border-zinc-300 bg-white/95">
            <CardHeader>
              <CardTitle>What teams get immediately</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-700">
              <div className="rounded-lg border border-zinc-200 p-3">
                Direct login only. No public signup.
              </div>
              <div className="rounded-lg border border-zinc-200 p-3">
                Agent role stays view-only for protected finance data.
              </div>
              <div className="rounded-lg border border-zinc-200 p-3">
                Automatic ledger creation on admission submission.
              </div>
              <div className="rounded-lg border border-zinc-200 p-3">
                Per-course agent commission rules with percentage or fixed values.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.title} className="h-full">
                <CardContent className="space-y-3 pt-6">
                  <div className="inline-flex rounded-lg bg-zinc-100 p-2">
                    <Icon className="h-5 w-5 text-zinc-700" />
                  </div>
                  <h3 className="text-base font-semibold">{module.title}</h3>
                  <p className="text-sm text-zinc-600">{module.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Admission workflow</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">
              Multi-step intake with automatic fee snapshots, expense capture, and profitability
              calculations.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Finance ledger views</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">
              University payable ledger, agent payout ledger, and final profit ledger stay aligned
              per admission.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Role-specific dashboards</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">
              Super admin, consultant, staff, and agent users see only the modules they are allowed
              to access.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <Card className="border-cyan-200 bg-cyan-50/70">
          <CardContent className="flex flex-col gap-4 py-10 text-center sm:items-center">
            <h2 className="text-2xl font-bold text-zinc-900">
              Ready to run your consultancy with tighter control?
            </h2>
            <p className="max-w-2xl text-sm text-zinc-700 sm:text-base">
              Keep operations internal, lock role permissions, and monitor true net profitability in
              one system.
            </p>
            <Button asChild size="lg">
              <Link href="/login" className="no-underline">
                Login to CRM
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
