import { headers } from 'next/headers';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getClientIpFromForwarded, hashValue } from '@/lib/security';

type AuditMetadata = Prisma.InputJsonValue | undefined;

export type AuditEventInput = {
  actorId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  success?: boolean;
  metadata?: AuditMetadata;
  ipHash?: string | null;
  userAgent?: string | null;
};

function resolveRequestMeta():
  | {
      ipHash?: string;
      userAgent?: string | null;
    }
  | undefined {
  try {
    const headerStore = headers();
    const ip = getClientIpFromForwarded(headerStore.get('x-forwarded-for'));
    return {
      ipHash: hashValue(ip),
      userAgent: headerStore.get('user-agent'),
    };
  } catch {
    return undefined;
  }
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const requestMeta = resolveRequestMeta();
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        success: input.success ?? true,
        metadata: input.metadata,
        ipHash: input.ipHash ?? requestMeta?.ipHash ?? null,
        userAgent: input.userAgent ?? requestMeta?.userAgent ?? null,
      },
    });
  } catch {
    // Auditing should not break user-facing workflows.
  }
}
