import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security | EduConnect CRM',
  description: 'High-level security posture of EduConnect CRM.',
  openGraph: {
    title: 'Security | EduConnect CRM',
    description: 'High-level security posture of EduConnect CRM.',
  },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Security</h1>
      <p className="mt-3 text-sm text-zinc-600">Last updated: February 24, 2026</p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">High-level security posture of EduConnect CRM.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>Role-based access control enforces module-level restrictions across user roles.</li>
          <li>Direct login is controlled by administrators. Public signup is disabled.</li>
          <li>Sensitive actions are validated on the server before database updates.</li>
          <li>Rate limiting and spam controls are applied on public form submissions.</li>
          <li>Regular dependency and environment hygiene is recommended for all deployments.</li>
        </ul>
      </div>
    </section>
  );
}
