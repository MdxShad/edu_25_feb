import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | EduConnect CRM',
  description: 'How EduConnect CRM handles personal and operational data.',
  openGraph: {
    title: 'Privacy Policy | EduConnect CRM',
    description: 'How EduConnect CRM handles personal and operational data.',
  },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Privacy Policy</h1>
      <p className="mt-3 text-sm text-zinc-600">Last updated: February 24, 2026</p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">
          How EduConnect CRM handles personal and operational data.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            We collect account, operational, and support data required to run internal CRM features.
          </li>
          <li>
            Data is used to provide admissions tracking, accounting ledgers, support, and security
            monitoring.
          </li>
          <li>Access to CRM records is role-based and limited to authorized internal users.</li>
          <li>We do not provide public access to student admission records through this CRM.</li>
          <li>You can request corrections to inaccurate data by contacting the support team.</li>
        </ul>
      </div>
    </section>
  );
}
