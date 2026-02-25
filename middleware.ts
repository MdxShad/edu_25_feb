import { NextResponse, type NextRequest } from 'next/server';
import { isRouteAllowed, type RbacUser } from '@/lib/rbac';
import { checkRateLimit } from '@/lib/rate-limit';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'educonnect_session';

async function resolveSessionUser(request: NextRequest): Promise<RbacUser | null> {
  const cookieHeader = request.headers.get('cookie') || '';

  const response = await fetch(new URL('/api/auth/session', request.url), {
    method: 'GET',
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    authenticated?: boolean;
    user?: RbacUser;
  };

  if (!payload.authenticated || !payload.user) return null;
  return payload.user;
}

function forbiddenResponse() {
  return new NextResponse('Forbidden', { status: 403 });
}

function tooManyRequests(retryAfterSeconds: number) {
  return new NextResponse('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': String(retryAfterSeconds) },
  });
}

function getIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return 'unknown';
  return forwarded.split(',')[0]?.trim() || 'unknown';
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (request.method === 'POST' && (pathname === '/login' || pathname === '/contact')) {
    const ip = getIp(request);
    const target = pathname === '/login' ? 'auth' : 'contact';
    const limit = pathname === '/login' ? 15 : 10;
    const windowMs = 10 * 60 * 1000;
    const rate = checkRateLimit({
      key: `middleware:${target}:${ip}`,
      limit,
      windowMs,
    });
    if (!rate.allowed) {
      return tooManyRequests(rate.retryAfterSeconds);
    }
  }

  const hasSessionToken = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === '/login') {
    if (!hasSessionToken) return NextResponse.next();
    const user = await resolveSessionUser(request);
    if (user) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  if (!hasSessionToken) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  const user = await resolveSessionUser(request);
  if (!user) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  if (!isRouteAllowed(pathname, user)) {
    return forbiddenResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/contact'],
};
