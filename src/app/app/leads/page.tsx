import Link from 'next/link';
import { LeadStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { parsePeriodFilter } from '@/lib/filters';
import { ReportFilterBar } from '@/components/reports/filter-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { updateLeadAction } from './actions';

function canViewLeads(user: { role: Role; permissions: unknown | null }) {
  return (
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'leadsView'))
  );
}

function snippet(value: string, length: number) {
  const trimmed = value.trim();
  if (trimmed.length <= length) return trimmed;
  return `${trimmed.slice(0, length)}...`;
}

const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'WON'];

export default async function LeadsInboxPage({
  searchParams,
}: {
  searchParams: { mode?: string; from?: string; to?: string; q?: string; status?: string; mine?: string };
}) {
  const user = await requireUser();

  if (!canViewLeads(user)) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const period = parsePeriodFilter(searchParams);
  const q = (searchParams.q ?? '').trim();
  const status = LEAD_STATUSES.includes(searchParams.status as LeadStatus)
    ? (searchParams.status as LeadStatus)
    : undefined;
  const mine = searchParams.mine === '1';

  const [consultantsAndStaff, leads] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [Role.CONSULTANT, Role.STAFF] }, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, role: true },
    }),
    prisma.lead.findMany({
      where: {
        createdAt: { gte: period.from, lte: period.to },
        ...(status ? { status } : {}),
        ...(mine ? { assignedToId: user.id } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  ]);

  const exportQuery = new URLSearchParams({
    mode: period.mode,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(mine ? { mine: '1' } : {}),
  }).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leads Inbox</h1>
          <p className="mt-1 text-sm text-zinc-600">Internal leads from public contact forms.</p>
        </div>
        <Link className="text-sm underline" href={`/api/exports/leads?${exportQuery}`}>
          Export CSV
        </Link>
      </div>

      <ReportFilterBar mode={period.mode} from={period.from} to={period.to} actionPath="/app/leads" />

      <form className="rounded-md border border-zinc-200 bg-zinc-50 p-3" method="get">
        <input type="hidden" name="mode" value={period.mode} />
        <input type="hidden" name="from" value={period.from.toISOString()} />
        <input type="hidden" name="to" value={period.to.toISOString()} />
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, email, or phone"
            className="h-9 w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 text-sm"
          />
          <select name="status" defaultValue={status ?? ''} className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm">
            <option value="">All Status</option>
            {LEAD_STATUSES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="mine" value="1" defaultChecked={mine} /> My leads
          </label>
          <Button type="submit" size="sm" variant="secondary">Search</Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Phone</TH>
                  <TH>Message</TH>
                  <TH>Status</TH>
                  <TH>Assigned</TH>
                  <TH>Source</TH>
                  <TH>Page URL</TH>
                  <TH>Received</TH>
                </TR>
              </THead>
              <TBody>
                {leads.map((lead) => (
                  <TR key={lead.id}>
                    <TD>{lead.name}</TD>
                    <TD>{lead.email}</TD>
                    <TD>{lead.phone ?? '-'}</TD>
                    <TD title={lead.message}>{snippet(lead.message, 70)}</TD>
                    <TD>
                      <form action={updateLeadAction} className="space-y-1">
                        <input type="hidden" name="leadId" value={lead.id} />
                        <select name="status" defaultValue={lead.status} className="h-8 rounded border border-zinc-300 bg-white px-2 text-xs">
                          {LEAD_STATUSES.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                        <input name="internalNotes" defaultValue={lead.internalNotes ?? ''} placeholder="Notes" className="h-8 w-40 rounded border border-zinc-300 px-2 text-xs" />
                        <select name="assignedToId" defaultValue={lead.assignedToId ?? ''} className="h-8 rounded border border-zinc-300 bg-white px-2 text-xs">
                          <option value="">Unassigned</option>
                          {consultantsAndStaff.map((person) => (
                            <option key={person.id} value={person.id}>{person.name} ({person.role})</option>
                          ))}
                        </select>
                        <button type="submit" className="block text-xs underline">Save</button>
                      </form>
                    </TD>
                    <TD>{lead.assignedTo?.name ?? '-'}</TD>
                    <TD>{lead.source ?? '-'}</TD>
                    <TD>
                      {lead.pageUrl ? (
                        <a className="underline" href={lead.pageUrl} target="_blank" rel="noreferrer">
                          {snippet(lead.pageUrl, 40)}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TD>
                    <TD>{new Date(lead.createdAt).toLocaleString()}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          {leads.length === 0 ? (
            <div className="mt-2 text-sm text-zinc-600">No leads found for selected filters.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
