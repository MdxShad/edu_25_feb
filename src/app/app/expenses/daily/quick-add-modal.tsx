'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addDailyExpenseAction } from '../actions';

const categories = [
  { value: 'RENT', label: 'Rent' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'OTHER', label: 'Other' },
];

export function QuickAddExpenseModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Add Expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Add Expense</DialogTitle>
        </DialogHeader>
        <form action={addDailyExpenseAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="Office rent" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" min={0} step={1} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="proofUrl">Proof URL</Label>
            <Input id="proofUrl" name="proofUrl" placeholder="https://..." />
          </div>
          <Button type="submit">Save Expense</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
