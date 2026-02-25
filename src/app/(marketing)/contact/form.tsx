'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitContactLeadAction, type ContactLeadState } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const initialState: ContactLeadState = {
  ok: false,
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Submitting...' : 'Send Message'}
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useFormState(submitContactLeadAction, initialState);
  const [pageUrl, setPageUrl] = React.useState('');

  React.useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Talk to our team</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.message ? (
            <Alert variant={state.ok ? 'success' : 'error'}>{state.message}</Alert>
          ) : null}

          <input type="hidden" name="website" defaultValue="" tabIndex={-1} autoComplete="off" />
          <input type="hidden" name="source" value="website-contact-page" readOnly />
          <input type="hidden" name="pageUrl" value={pageUrl} readOnly />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required minLength={2} />
              {state.fieldErrors?.name ? (
                <p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
              {state.fieldErrors?.email ? (
                <p className="text-xs text-red-600">{state.fieldErrors.email[0]}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                required
                minLength={10}
                className="min-h-[140px]"
              />
              {state.fieldErrors?.message ? (
                <p className="text-xs text-red-600">{state.fieldErrors.message[0]}</p>
              ) : null}
            </div>
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
