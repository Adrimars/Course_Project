import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const roleUpdateSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

/**
 * PATCH /api/users/[id]
 * Admin only: promote or demote a user's role.
 * spec CHK002: Any ADMIN can promote any USER.
 * spec CHK003: Cannot remove the last administrator.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: 'Only admins can change user roles.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  // Prevent admins from demoting themselves
  if (id === session.user.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role.' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = roleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role value.' }, { status: 400 });
  }

  const { role } = parsed.data;

  // spec CHK003: Prevent demotion of the last admin
  if (role === Role.USER) {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last administrator.' },
        { status: 409 }
      );
    }
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}
