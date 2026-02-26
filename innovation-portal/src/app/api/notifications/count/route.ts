import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// ─── GET /api/notifications/count — Unread notification count ─────────────────
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unreadCount = await prisma.notification.count({
        where: {
            userId: session.user.id,
            isRead: false,
        },
    });

    return NextResponse.json({ unreadCount });
}
