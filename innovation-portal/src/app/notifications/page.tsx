import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { NotificationList } from '@/components/ideas/NotificationList';
import { prisma } from '@/lib/db';

export default async function NotificationsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const limit = 20;

    const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }),
        prisma.notification.count({ where: { userId: session.user.id } }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const items = notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
    }));

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">🔔 Notifications</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Stay updated on status changes, feedback, and activity on your ideas.
                    </p>
                </div>

                <NotificationList
                    initialItems={items}
                    initialPagination={{
                        page: 1,
                        totalPages,
                        totalCount,
                        hasNext: totalPages > 1,
                        hasPrev: false,
                    }}
                />
            </main>
        </>
    );
}
