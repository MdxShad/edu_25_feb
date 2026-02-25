import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

export default async function AuditLogsPage() {
  await requireRole([Role.SUPER_ADMIN]);

  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Security and action trail across admissions, auth, payments, and AI usage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Time</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>Actor</TH>
                  <TH>Status</TH>
                  <TH>Meta</TH>
                </TR>
              </THead>
              <TBody>
                {logs.map((log) => (
                  <TR key={log.id}>
                    <TD>{new Date(log.createdAt).toLocaleString()}</TD>
                    <TD>{log.action}</TD>
                    <TD>
                      {log.entityType ?? '-'} {log.entityId ? `(${log.entityId})` : ''}
                    </TD>
                    <TD>{log.actor?.name ?? '-'}</TD>
                    <TD>{log.success ? 'Success' : 'Failed'}</TD>
                    <TD>
                      {log.metadata ? (
                        <pre className="max-w-md overflow-x-auto whitespace-pre-wrap text-xs text-zinc-700">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      ) : (
                        '-'
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          {logs.length === 0 ? (
            <div className="text-sm text-zinc-600">No audit entries yet.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
