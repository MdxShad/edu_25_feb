'use server';

import { cookies, headers as requestHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './db';
import { loginSchema } from './validation';
import { Role } from '@prisma/client';
import { checkRateLimit } from './rate-limit';
import { getClientIpFromForwarded, hashValue } from './security';
import { logAuditEvent } from './audit';
import { ensureEnv } from './env';

const env = ensureEnv();
const COOKIE_NAME = env.SESSION_COOKIE_NAME;
const TTL_DAYS = env.SESSION_TTL_DAYS;

export type AuthUser = {
  id: string;
  userId: string;
  name: string;
  role: Role;
  parentId: string | null;
  permissions: unknown | null;
};

function ttlMs(): number {
  const days = Number.isFinite(TTL_DAYS) && TTL_DAYS > 0 ? TTL_DAYS : 14;
  return days * 24 * 60 * 60 * 1000;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          userId: true,
          name: true,
          role: true,
          parentId: true,
          permissions: true,
          isActive: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Clean up expired session
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
    return null;
  }
  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    userId: session.user.userId,
    name: session.user.name,
    role: session.user.role,
    parentId: session.user.parentId,
    permissions: session.user.permissions,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(roles: Role[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect('/app');
  return user;
}

async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMs());

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function signInAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const raw = {
    userId: String(formData.get('userId') ?? ''),
    password: String(formData.get('password') ?? ''),
  };

  const headerStore = requestHeaders();
  const ip =
    getClientIpFromForwarded(headerStore.get('x-forwarded-for')) ||
    headerStore.get('x-real-ip') ||
    'unknown';
  const ipHash = hashValue(ip);
  const userKey = hashValue(raw.userId.toLowerCase());

  const ipRate = checkRateLimit({
    key: `auth:ip:${ipHash}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  const userRate = checkRateLimit({
    key: `auth:user:${userKey}`,
    limit: 6,
    windowMs: 10 * 60 * 1000,
  });
  if (!ipRate.allowed || !userRate.allowed) {
    await logAuditEvent({
      action: 'LOGIN_RATE_LIMITED',
      success: false,
      entityType: 'Auth',
      metadata: {
        userId: raw.userId,
        retryAfterSeconds: Math.max(ipRate.retryAfterSeconds, userRate.retryAfterSeconds),
      },
      ipHash,
      userAgent: headerStore.get('user-agent'),
    });
    return { ok: false, error: 'Too many attempts. Please wait and try again.' };
  }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    await logAuditEvent({
      action: 'LOGIN_FAILED',
      success: false,
      entityType: 'Auth',
      metadata: { reason: 'INVALID_PAYLOAD', userId: raw.userId },
      ipHash,
      userAgent: headerStore.get('user-agent'),
    });
    return { ok: false, error: 'Invalid credentials format.' };
  }

  const user = await prisma.user.findUnique({
    where: { userId: parsed.data.userId },
    select: { id: true, passwordHash: true, isActive: true },
  });

  if (!user || !user.isActive) {
    await logAuditEvent({
      action: 'LOGIN_FAILED',
      success: false,
      entityType: 'Auth',
      metadata: { reason: 'USER_NOT_FOUND_OR_INACTIVE', userId: parsed.data.userId },
      ipHash,
      userAgent: headerStore.get('user-agent'),
    });
    return { ok: false, error: 'Invalid credentials.' };
  }

  const match = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!match) {
    await logAuditEvent({
      action: 'LOGIN_FAILED',
      success: false,
      actorId: user.id,
      entityType: 'Auth',
      metadata: { reason: 'PASSWORD_MISMATCH', userId: parsed.data.userId },
      ipHash,
      userAgent: headerStore.get('user-agent'),
    });
    return { ok: false, error: 'Invalid credentials.' };
  }

  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  await createSession(user.id);
  await logAuditEvent({
    action: 'LOGIN_SUCCESS',
    success: true,
    actorId: user.id,
    entityType: 'Auth',
    metadata: { userId: parsed.data.userId },
    ipHash,
    userAgent: headerStore.get('user-agent'),
  });
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
  }

  cookies().set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });

  redirect('/login');
}
