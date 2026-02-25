import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createAgentAction, toggleAgentActiveAction } from './actions';
import { AgentIdProofFields } from './agent-id-proof-fields';

export default async function AgentsPage() {
  const user = await requireUser();
  if (user.role !== Role.SUPER_ADMIN && user.role !== Role.CONSULTANT) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const consultants =
    user.role === Role.SUPER_ADMIN
      ? await prisma.user.findMany({ where: { role: Role.CONSULTANT }, orderBy: { name: 'asc' } })
      : [];

  const agents = await prisma.user.findMany({
    where:
      user.role === Role.CONSULTANT
        ? { role: Role.AGENT, parentId: user.id }
        : { role: Role.AGENT },
    include: { parent: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agents</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Create and manage agents. Set commission per course inside each agent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAgentAction} className="grid gap-4 md:grid-cols-2">
            {user.role === Role.SUPER_ADMIN ? (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="parentConsultantId">Parent Consultant</Label>
                <Select id="parentConsultantId" name="parentConsultantId" defaultValue="" required>
                  <option value="" disabled>
                    Select consultant
                  </option>
                  {consultants.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.userId})
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="userId">Agent User ID</Label>
              <Input id="userId" name="userId" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" name="mobile" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="idProofUrl">ID proof URL (optional fallback)</Label>
              <Input id="idProofUrl" name="idProofUrl" placeholder="https://..." />
            </div>

            <AgentIdProofFields />

            <div className="md:col-span-2">
              <Button type="submit">Create Agent</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Agent</TH>
                  <TH>Parent Consultant</TH>
                  <TH>Contact</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {agents.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-zinc-500">{a.userId}</div>
                    </TD>
                    <TD>
                      {a.parent ? (
                        <div>
                          <div className="text-sm">{a.parent.name}</div>
                          <div className="text-xs text-zinc-500">{a.parent.userId}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TD>
                    <TD>
                      <div>{a.mobile ?? '—'}</div>
                      <div className="text-xs text-zinc-500">{a.email ?? ''}</div>
                    </TD>
                    <TD>
                      {a.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-3">
                        <Link className="text-sm underline" href={`/app/agents/${a.id}`}>
                          Commission
                        </Link>
                        <form action={toggleAgentActiveAction.bind(null, a.id)}>
                          <button className="text-sm underline" type="submit">
                            {a.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </form>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {agents.length === 0 ? <div className="text-sm text-zinc-600">No agents yet.</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
