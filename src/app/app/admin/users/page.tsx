import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ALL_STAFF_PERMISSIONS } from '@/lib/roles';
import {
  createConsultantAction,
  createStaffAction,
  toggleUserActiveAction,
  resetUserPasswordAction,
} from './actions';

export default async function UsersPage() {
  await requireRole([Role.SUPER_ADMIN]);

  const [consultants, users] = await Promise.all([
    prisma.user.findMany({ where: { role: Role.CONSULTANT }, orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({
      include: { parent: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users & Staff</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Create staff/consultants. Agents are created by consultants.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Consultant</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createConsultantAction} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="c_userId">User ID</Label>
                  <Input id="c_userId" name="userId" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c_password">Password</Label>
                  <Input id="c_password" name="password" type="password" required />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="c_name">Name</Label>
                <Input id="c_name" name="name" required />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="c_email">Email</Label>
                  <Input id="c_email" name="email" type="email" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c_mobile">Mobile</Label>
                  <Input id="c_mobile" name="mobile" />
                </div>
              </div>

              <Button type="submit">Create Consultant</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createStaffAction} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="s_userId">User ID</Label>
                  <Input id="s_userId" name="userId" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s_password">Password</Label>
                  <Input id="s_password" name="password" type="password" required />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="s_name">Name</Label>
                <Input id="s_name" name="name" required />
              </div>

              <div className="space-y-1">
                <Label htmlFor="parentConsultantId">Assign to Consultant (optional)</Label>
                <Select id="parentConsultantId" name="parentConsultantId" defaultValue="">
                  <option value="">— Not assigned —</option>
                  {consultants.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.userId})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Permissions</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {ALL_STAFF_PERMISSIONS.map((p) => (
                    <label
                      key={p.key}
                      className="flex items-start gap-2 rounded-md border border-zinc-200 p-2"
                    >
                      <Checkbox name="permissions" value={p.key} />
                      <span>
                        <div className="text-sm font-medium">{p.label}</div>
                        <div className="text-xs text-zinc-600">{p.description}</div>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit">Create Staff</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>User</TH>
                  <TH>Role</TH>
                  <TH>Parent</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {users.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-zinc-500">{u.userId}</div>
                    </TD>
                    <TD>{u.role}</TD>
                    <TD>
                      {u.parent ? (
                        <div>
                          <div className="text-sm">{u.parent.name}</div>
                          <div className="text-xs text-zinc-500">{u.parent.userId}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TD>
                    <TD>
                      {u.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      {u.role === Role.SUPER_ADMIN ? (
                        <span className="text-xs text-zinc-500">—</span>
                      ) : (
                        <div className="flex justify-end gap-3">
                          <form action={toggleUserActiveAction.bind(null, u.id)}>
                            <button className="text-sm underline" type="submit">
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </form>
                          <form
                            action={resetUserPasswordAction.bind(null, u.id)}
                            className="flex items-center gap-2"
                          >
                            <Input
                              name="password"
                              type="password"
                              placeholder="New password"
                              className="h-8 w-40"
                            />
                            <button className="text-sm underline" type="submit">
                              Reset
                            </button>
                          </form>
                        </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
