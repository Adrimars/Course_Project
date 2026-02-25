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

  // BUG-1 FIX: Wrap count + update in a serializable transaction to prevent
  // two admins from concurrently demoting each other past the guard.
  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        // spec CHK003: Prevent demotion of the last admin
        if (role === Role.USER) {
          const adminCount = await tx.user.count({
            where: { role: 'ADMIN' },
          });
          if (adminCount <= 1) {
            throw new Error('LAST_ADMIN');
          }
        }

        const targetUser = await tx.user.findUnique({ where: { id } });
        if (!targetUser) {
          throw new Error('NOT_FOUND');
        }

        return tx.user.update({
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
      },
      { isolationLevel: 'Serializable' }
    );

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'LAST_ADMIN') {
        return NextResponse.json(
          { error: 'Cannot remove the last administrator.' },
          { status: 409 }
        );
      }
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }
    console.error('[PATCH /api/users/[id]]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
