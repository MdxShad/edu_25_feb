import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy | EduConnect CRM',
  description: 'Refund policy for EduConnect CRM subscriptions and service engagements.',
  openGraph: {
    title: 'Refund Policy | EduConnect CRM',
    description: 'Refund policy for EduConnect CRM subscriptions and service engagements.',
  },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Refund Policy</h1>
      <p className="mt-3 text-sm text-zinc-600">Last updated: February 24, 2026</p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">
          Refund policy for EduConnect CRM subscriptions and service engagements.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            Billing commitments and billing cycles are defined in your signed proposal or invoice.
          </li>
          <li>If a duplicate payment is confirmed, a correction or refund will be issued.</li>
          <li>
            Custom implementation and migration services may be non-refundable once delivered.
          </li>
          <li>For disputes, contact support with invoice and payment reference details.</li>
        </ul>
      </div>
    </section>
  );
}
