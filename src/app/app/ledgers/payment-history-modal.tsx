'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatINR } from '@/lib/money';

type PaymentEntry = {
  id: string;
  amount: number;
  paidAtIso: string;
  method: string;
  reference: string | null;
  notes: string | null;
  proofUrl: string | null;
  slipUrl: string;
};

export function PaymentHistoryModal(props: {
  title: string;
  description: string;
  entries: PaymentEntry[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs">
          Payment history ({props.entries.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {props.entries.map((entry) => (
            <div key={entry.id} className="rounded-md border border-zinc-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{formatINR(entry.amount)}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(entry.paidAtIso).toLocaleString()} • {entry.method}
                </div>
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Ref: {entry.reference || '-'}
                {entry.notes ? ` • ${entry.notes}` : ''}
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <a className="underline" href={entry.slipUrl} target="_blank" rel="noreferrer">
                  PDF Slip
                </a>
                {entry.proofUrl ? (
                  <a className="underline" href={entry.proofUrl} target="_blank" rel="noreferrer">
                    Proof
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
