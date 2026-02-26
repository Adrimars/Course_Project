import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteParams = {
    params: Promise<{ id: string }>;
};

// ─── PATCH /api/notifications/[id] — Mark single notification as read ─────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const notification = await prisma.notification.findUnique({
        where: { id },
    });

    if (!notification || notification.userId !== session.user.id) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
    });

    return NextResponse.json(updated);
}
