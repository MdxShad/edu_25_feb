'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signInAction } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

type FormState = { ok: boolean; error?: string };

const initialState: FormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<FormState, FormData>(async (_prev, fd) => {
    const res = await signInAction(fd);
    if (res.ok) {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      window.location.href = next && next.startsWith('/app') ? next : '/app';
      return { ok: true };
    }
    return { ok: false, error: res.error ?? 'Login failed.' };
  }, initialState);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>EduConnect CRM</CardTitle>
        <p className="mt-1 text-sm text-zinc-600">Login with your User ID and Password.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {state.error ? <Alert variant="error">{state.error}</Alert> : null}

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              name="userId"
              placeholder="e.g. admin"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <SubmitButton />
        </form>

        <div className="text-xs text-zinc-500">
          Super Admin credentials are created via <code>npm run db:seed</code>.
        </div>
      </CardContent>
    </Card>
  );
}
