import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookies Policy | EduConnect CRM',
  description: 'Cookie and session policy for EduConnect CRM websites and apps.',
  openGraph: {
    title: 'Cookies Policy | EduConnect CRM',
    description: 'Cookie and session policy for EduConnect CRM websites and apps.',
  },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Cookies Policy</h1>
      <p className="mt-3 text-sm text-zinc-600">Last updated: February 24, 2026</p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">
          Cookie and session policy for EduConnect CRM websites and apps.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            We use essential cookies for login sessions, security checks, and request integrity.
          </li>
          <li>Analytics or optional cookies are used only where explicitly configured.</li>
          <li>Blocking essential cookies may prevent authentication and secure operation.</li>
        </ul>
      </div>
    </section>
  );
}
