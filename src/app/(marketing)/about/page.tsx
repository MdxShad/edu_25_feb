import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'About | EduConnect CRM',
  description: 'Learn about EduConnect CRM and our focus on internal consultancy operations.',
  openGraph: {
    title: 'About EduConnect CRM',
    description: 'Internal CRM platform for education consultancies.',
  },
};

export default function AboutPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">About EduConnect CRM</h1>
      <p className="mt-3 max-w-3xl text-zinc-600">
        EduConnect CRM was built for consultancy teams that need strict role controls and accurate
        financial tracking across every admission.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Internal-first</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600">
            Designed as an internal operations system, not a public marketplace.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Finance integrity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600">
            Every admission maps to university payable, agent commission, expenses, and net profit.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Practical controls</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600">
            Super admin governance with consultant, staff, and agent-specific permissions.
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
