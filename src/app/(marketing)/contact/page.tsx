import type { Metadata } from 'next';
import { ContactForm } from './form';

export const metadata: Metadata = {
  title: 'Contact | EduConnect CRM',
  description: 'Contact EduConnect CRM for onboarding, setup, and support.',
  openGraph: {
    title: 'Contact EduConnect CRM',
    description: 'Talk to our team about CRM onboarding and setup.',
  },
};

export default function ContactPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Contact us</h1>
          <p className="mt-3 text-zinc-600">
            Share your workflow and team size. We will recommend a rollout plan for your consultancy
            operations.
          </p>
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">Response window</p>
            <p className="mt-1">Usually within 1 business day.</p>
            <p className="mt-3 font-semibold text-zinc-900">Email</p>
            <p className="mt-1">mentorclock.com@gmail.com</p>
          </div>
        </div>

        <ContactForm />
      </div>
    </section>
  );
}
