import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        role: user.role,
        parentId: user.parentId,
        permissions: user.permissions,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
