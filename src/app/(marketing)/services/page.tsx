import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Services | EduConnect CRM',
  description: 'Core modules and implementation scope of EduConnect CRM.',
  openGraph: {
    title: 'EduConnect CRM Services',
    description:
      'Admissions workflow, commission setup, accounting ledgers, and operational reporting.',
  },
};

const services = [
  'Admissions intake and conversion workflow',
  'University and course management',
  'Agent onboarding with per-course commission rules',
  'Daily expense register and accounting ledgers',
  'Role-based dashboards and permission controls',
];

export default function ServicesPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Services and Modules</h1>
      <p className="mt-3 text-zinc-600">
        EduConnect CRM provides the building blocks needed to run consultancy operations with
        security and financial transparency.
      </p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <ul className="space-y-4">
          {services.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              <span className="text-sm text-zinc-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
