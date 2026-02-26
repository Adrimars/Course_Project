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

  const [statusCounts, totalIdeas, myIdeasCount, recentNotifications, topIdeas] = await Promise.all([
    prisma.idea.groupBy({
      by: ['status'],
      where: visibilityFilter,
      _count: { id: true },
    }),
    prisma.idea.count({ where: visibilityFilter }),
    prisma.idea.count({ where: { submitterId: session.user.id } }),

    // Phase 7: Real notifications for this user
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    // Phase 7: Leaderboard — ideas with scores, ranked by average
    prisma.idea.findMany({
      where: {
        ...visibilityFilter,
        scores: { some: {} },
      },
      include: {
        submitter: { select: { name: true } },
        scores: {
          select: {
            feasibility: true,
            impact: true,
            novelty: true,
            costEffectiveness: true,
          },
        },
      },
    }),
  ]);

  // Transform notification items
  const notificationItems = recentNotifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  // Compute scores and sort for leaderboard widget
  const leaderboardItems = topIdeas
    .map((idea) => {
      const n = idea.scores.length;
      if (n === 0) return null;
      const totals = idea.scores.reduce(
        (acc: { f: number; i: number; n: number; c: number }, s) => ({
          f: acc.f + s.feasibility,
          i: acc.i + s.impact,
          n: acc.n + s.novelty,
          c: acc.c + s.costEffectiveness,
        }),
        { f: 0, i: 0, n: 0, c: 0 }
      );
      const avgScore = (totals.f / n + totals.i / n + totals.n / n + totals.c / n) / 4;
      return {
        id: idea.id,
        title: idea.title,
        submitterName: idea.submitter?.name ?? 'Unknown',
        status: idea.status,
        category: idea.category,
        avgScore: Math.round(avgScore * 100) / 100,
        scoreCount: n,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5);

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
