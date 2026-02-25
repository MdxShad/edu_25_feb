import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from './ui';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/app');

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <LoginForm />
      </div>
    </div>
  );
}
