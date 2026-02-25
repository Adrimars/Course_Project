import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { MiniNotifications } from '@/components/dashboard/MiniNotifications';
import { MiniLeaderboard } from '@/components/dashboard/MiniLeaderboard';
import { prisma } from '@/lib/db';
import { Role, IdeaStatus } from '@/types';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  // Visibility filter for analytics counts — same rules as idea listing
  const visibilityFilter = isPrivileged
    ? {}
    : {
      AND: [
        { status: { not: IdeaStatus.INSPECTING } },
        {
          OR: [
            { visibility: 'PUBLIC' as const },
            { submitterId: session.user.id },
          ],
        },
      ],
    };

  const [statusCounts, totalIdeas, myIdeasCount, recentActivity, topIdeas] = await Promise.all([
    prisma.idea.groupBy({
      by: ['status'],
      where: visibilityFilter,
      _count: { id: true },
    }),
    prisma.idea.count({ where: visibilityFilter }),
    prisma.idea.count({ where: { submitterId: session.user.id } }),

    // Notifications: recent status changes relevant to this user
    prisma.statusHistory.findMany({
      where: isPrivileged
        ? {} // admins/inspectors see all activity
        : { idea: { submitterId: session.user.id } }, // regular users see their own ideas
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        idea: { select: { title: true } },
        admin: { select: { name: true } },
      },
    }),

    // Leaderboard: accepted ideas first, then most recently updated
    prisma.idea.findMany({
      where: {
        ...visibilityFilter,
        status: { in: ['ACCEPTED', 'UNDER_REVIEW', 'SUBMITTED'] as IdeaStatus[] },
      },
      orderBy: [
        { status: 'asc' }, // ACCEPTED sorts first alphabetically
        { updatedAt: 'desc' },
      ],
      take: 5,
      include: {
        submitter: { select: { name: true } },
      },
    }),
  ]);

  // Transform data for the mini widgets
  const notificationItems = recentActivity.map((h) => ({
    id: h.id,
    ideaTitle: h.idea.title,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    feedback: h.feedback,
    actorName: h.admin?.name ?? 'System',
    createdAt: h.createdAt.toISOString(),
  }));

  const leaderboardItems = topIdeas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    submitterName: idea.submitter?.name ?? 'Unknown',
    status: idea.status,
    category: idea.category,
    updatedAt: idea.updatedAt.toISOString(),
  }));

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user.name.split(' ')[0]}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s an overview of the innovation portal activity.
          </p>
        </div>

        {/* Analytics */}
        <AnalyticsDashboard
          statusCounts={statusCounts as any}
          totalIdeas={totalIdeas}
          myIdeasCount={myIdeasCount}
        />

        {/* Mini Widgets */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MiniNotifications items={notificationItems} />
          <MiniLeaderboard items={leaderboardItems} />
        </div>
      </main>
    </>
  );
}
