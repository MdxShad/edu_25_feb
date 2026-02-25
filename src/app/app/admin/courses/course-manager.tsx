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
import { createCourseAction, deleteCourseAction, updateCourseAction } from './actions';
import { formatINR } from '@/lib/money';
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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';

const courseClientSchema = z
  .object({
    universityId: z.string().min(1, 'University is required'),
    name: z.string().min(2, 'Course name is required').max(200),
    duration: z.string().max(100).optional(),
    type: z.string().max(100).optional(),
    universityFee: z.coerce.number().int().nonnegative(),
    displayFee: z.coerce.number().int().nonnegative(),
    session: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.displayFee < value.universityFee) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['displayFee'],
        message: 'Display fee must be greater than or equal to university fee.',
      });
    }
  });

type CourseFormValues = z.infer<typeof courseClientSchema>;

type UniversityOption = { id: string; name: string };

type CourseRow = {
  id: string;
  universityId: string;
  universityName: string;
  name: string;
  duration: string | null;
  type: string | null;
  universityFee: number;
  displayFee: number;
  session: string | null;
  notes: string | null;
};

function CourseForm({
  defaultValues,
  universities,
  onSubmit,
  submitting,
  submitLabel,
}: {
  defaultValues: CourseFormValues;
  universities: UniversityOption[];
  onSubmit: (values: CourseFormValues) => Promise<void>;
  submitting: boolean;
  submitLabel: string;
}) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseClientSchema),
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
          setFormError(error instanceof Error ? error.message : 'Failed to save course.');
        }
      })}
    >
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="universityId">University</Label>
        <Select id="universityId" {...form.register('universityId')}>
          <option value="">Select university</option>
          {universities.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
        {form.formState.errors.universityId ? (
          <p className="text-xs text-red-600">{form.formState.errors.universityId.message}</p>
        ) : null}
      </div>

      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="name">Course Name</Label>
        <Input id="name" {...form.register('name')} />
        {form.formState.errors.name ? (
          <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="duration">Duration</Label>
        <Input id="duration" {...form.register('duration')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="type">Course Type</Label>
        <Input id="type" {...form.register('type')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="universityFee">University Fee</Label>
        <Input
          id="universityFee"
          type="number"
          min={0}
          step={1}
          {...form.register('universityFee')}
        />
        {form.formState.errors.universityFee ? (
          <p className="text-xs text-red-600">{form.formState.errors.universityFee.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="displayFee">Display Fee</Label>
        <Input id="displayFee" type="number" min={0} step={1} {...form.register('displayFee')} />
        {form.formState.errors.displayFee ? (
          <p className="text-xs text-red-600">{form.formState.errors.displayFee.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="session">Admission Session</Label>
        <Input id="session" {...form.register('session')} />
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

export function CourseManager({
  universities,
  courses,
}: {
  universities: UniversityOption[];
  courses: CourseRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }]);
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState<CourseRow | null>(null);
  const [submittingCreate, setSubmittingCreate] = React.useState(false);
  const [submittingEdit, setSubmittingEdit] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((row) => {
      const haystack =
        `${row.name} ${row.universityName} ${row.type ?? ''} ${row.session ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [courses, query]);

  const columns = React.useMemo<ColumnDef<CourseRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Course
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-zinc-500">
              {[row.original.type, row.original.duration].filter(Boolean).join(' - ') || '-'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'universityName',
        header: 'University',
      },
      {
        accessorKey: 'universityFee',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Fees
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div>University: {formatINR(row.original.universityFee)}</div>
            <div className="text-xs text-zinc-500">
              Display: {formatINR(row.original.displayFee)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'session',
        header: 'Session',
        cell: ({ row }) => row.original.session || '-',
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
                  <DialogTitle>Edit Course</DialogTitle>
                  <DialogDescription>Update course details and save changes.</DialogDescription>
                </DialogHeader>
                {editing ? (
                  <CourseForm
                    defaultValues={{
                      universityId: editing.universityId,
                      name: editing.name,
                      duration: editing.duration || '',
                      type: editing.type || '',
                      universityFee: editing.universityFee,
                      displayFee: editing.displayFee,
                      session: editing.session || '',
                      notes: editing.notes || '',
                    }}
                    universities={universities}
                    submitting={submittingEdit}
                    submitLabel="Save Changes"
                    onSubmit={async (values) => {
                      setSubmittingEdit(true);
                      try {
                        const result = await updateCourseAction(editing.id, values);
                        if (!result.ok) throw new Error(result.formError);
                        toast({
                          title: 'Course updated',
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
                const confirmed = window.confirm(`Delete course "${row.original.name}"?`);
                if (!confirmed) return;
                setDeletingId(row.original.id);
                const result = await deleteCourseAction(row.original.id);
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
                  title: 'Course deleted',
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
    [deletingId, editing, router, submittingEdit, toast, universities]
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
          <CardTitle>Add Course</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm
            defaultValues={{
              universityId: universities[0]?.id ?? '',
              name: '',
              duration: '',
              type: '',
              universityFee: 0,
              displayFee: 0,
              session: '',
              notes: '',
            }}
            universities={universities}
            submitting={submittingCreate}
            submitLabel="Create Course"
            onSubmit={async (values) => {
              setSubmittingCreate(true);
              try {
                const result = await createCourseAction(values);
                if (!result.ok) throw new Error(result.formError);
                toast({ title: 'Course created', description: `${values.name} has been added.` });
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
          <CardTitle>Courses</CardTitle>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by course, university, type, session..."
            className="md:w-96"
          />
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <EmptyState
              title="No courses found"
              description={
                query ? 'Try a different search term.' : 'Create your first course to begin.'
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
