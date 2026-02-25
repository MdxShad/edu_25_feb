import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | EduConnect CRM',
  description: 'Terms for use of EduConnect CRM.',
  openGraph: {
    title: 'Terms and Conditions | EduConnect CRM',
    description: 'Terms for use of EduConnect CRM.',
  },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Terms and Conditions</h1>
      <p className="mt-3 text-sm text-zinc-600">Last updated: February 24, 2026</p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">Terms for use of EduConnect CRM.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>EduConnect CRM is intended for internal consultancy operations only.</li>
          <li>
            User credentials are issued by authorized administrators. Account sharing is prohibited.
          </li>
          <li>
            You are responsible for ensuring that uploaded or entered data is lawful and accurate.
          </li>
          <li>
            The service may be updated to improve security, performance, and operational workflows.
          </li>
          <li>Violation of acceptable-use rules may result in account suspension.</li>
        </ul>
      </div>
    </section>
  );
}
