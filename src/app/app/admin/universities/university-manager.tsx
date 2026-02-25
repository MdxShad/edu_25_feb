'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import { createUniversityAction, deleteUniversityAction, updateUniversityAction } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';

const universityClientSchema = z.object({
  name: z.string().min(2, 'Name is required').max(200),
  location: z.string().max(200).optional(),
  contactPerson: z.string().max(200).optional(),
  contactNumber: z.string().max(50).optional(),
  email: z.string().email('Invalid email').max(200).optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

type UniversityFormValues = z.infer<typeof universityClientSchema>;

type UniversityRow = {
  id: string;
  name: string;
  location: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

function UniversityForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
}: {
  defaultValues: UniversityFormValues;
  onSubmit: (values: UniversityFormValues) => Promise<void>;
  submitting: boolean;
  submitLabel: string;
}) {
  const form = useForm<UniversityFormValues>({
    resolver: zodResolver(universityClientSchema),
    defaultValues,
  });

  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    form.reset(defaultValues);
    setFormError(null);
  }, [defaultValues, form]);

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={form.handleSubmit(async (values) => {
        setFormError(null);
        form.clearErrors();
        try {
          await onSubmit(values);
        } catch (error) {
          setFormError(error instanceof Error ? error.message : 'Failed to save university.');
        }
      })}
    >
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="name">University Name</Label>
        <Input id="name" {...form.register('name')} />
        {form.formState.errors.name ? (
          <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="location">Location</Label>
        <Input id="location" {...form.register('location')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contactPerson">Contact Person</Label>
        <Input id="contactPerson" {...form.register('contactPerson')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contactNumber">Contact Number</Label>
        <Input id="contactNumber" {...form.register('contactNumber')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register('email')} />
        {form.formState.errors.email ? (
          <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" {...form.register('address')} />
      </div>

      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...form.register('notes')} />
      </div>

      {formError ? <p className="text-sm text-red-600 md:col-span-2">{formError}</p> : null}

      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function UniversityManager({ universities }: { universities: UniversityRow[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }]);
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState<UniversityRow | null>(null);
  const [submittingCreate, setSubmittingCreate] = React.useState(false);
  const [submittingEdit, setSubmittingEdit] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return universities;
    return universities.filter((row) => {
      const haystack =
        `${row.name} ${row.location ?? ''} ${row.contactPerson ?? ''} ${row.email ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, universities]);

  const columns = React.useMemo<ColumnDef<UniversityRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            {row.original.address ? (
              <div className="text-xs text-zinc-500">{row.original.address}</div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => row.original.location || '-',
      },
      {
        accessorKey: 'contactPerson',
        header: 'Contact',
        cell: ({ row }) => (
          <div>
            <div>{row.original.contactPerson || '-'}</div>
            <div className="text-xs text-zinc-500">{row.original.contactNumber || ''}</div>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email || '-',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Dialog
              open={editing?.id === row.original.id}
              onOpenChange={(open: boolean) => {
                if (!open) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(row.original)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit University</DialogTitle>
                  <DialogDescription>Update university details and save changes.</DialogDescription>
                </DialogHeader>
                {editing ? (
                  <UniversityForm
                    defaultValues={{
                      name: editing.name,
                      location: editing.location || '',
                      contactPerson: editing.contactPerson || '',
                      contactNumber: editing.contactNumber || '',
                      email: editing.email || '',
                      address: editing.address || '',
                      notes: editing.notes || '',
                    }}
                    submitting={submittingEdit}
                    submitLabel="Save Changes"
                    onSubmit={async (values) => {
                      setSubmittingEdit(true);
                      try {
                        const result = await updateUniversityAction(editing.id, values);
                        if (!result.ok) {
                          throw new Error(result.formError);
                        }

                        toast({
                          title: 'University updated',
                          description: `${values.name} has been updated.`,
                        });
                        setEditing(null);
                        router.refresh();
                      } finally {
                        setSubmittingEdit(false);
                      }
                    }}
                  />
                ) : null}
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={deletingId === row.original.id}
              onClick={async () => {
                const confirmed = window.confirm(`Delete university "${row.original.name}"?`);
                if (!confirmed) return;
                setDeletingId(row.original.id);
                const result = await deleteUniversityAction(row.original.id);
                setDeletingId(null);
                if (!result.ok) {
                  toast({
                    title: 'Delete failed',
                    description: result.formError,
                    variant: 'destructive',
                  });
                  return;
                }
                toast({
                  title: 'University deleted',
                  description: `${row.original.name} has been removed.`,
                });
                router.refresh();
              }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deletingId, editing, router, submittingEdit, toast]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add University</CardTitle>
        </CardHeader>
        <CardContent>
          <UniversityForm
            defaultValues={{
              name: '',
              location: '',
              contactPerson: '',
              contactNumber: '',
              email: '',
              address: '',
              notes: '',
            }}
            submitting={submittingCreate}
            submitLabel="Create University"
            onSubmit={async (values) => {
              setSubmittingCreate(true);
              try {
                const result = await createUniversityAction(values);
                if (!result.ok) {
                  throw new Error(result.formError);
                }
                toast({
                  title: 'University created',
                  description: `${values.name} has been added.`,
                });
                router.refresh();
              } finally {
                setSubmittingCreate(false);
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Universities</CardTitle>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, location, contact, email..."
            className="md:w-96"
          />
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <EmptyState
              title="No universities found"
              description={
                query ? 'Try a different search term.' : 'Create your first university to begin.'
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TR key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TH key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TH>
                        ))}
                      </TR>
                    ))}
                  </THead>
                  <TBody>
                    {table.getRowModel().rows.map((row) => (
                      <TR key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TD key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TD>
                        ))}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-zinc-600">
                  Page {table.getState().pagination.pageIndex + 1} of{' '}
                  {Math.max(table.getPageCount(), 1)}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
