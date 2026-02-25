import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { IdeaList } from '@/components/ideas/IdeaList';
import { prisma } from '@/lib/db';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils';
import { Role } from '@/types';
import Link from 'next/link';

interface DashboardPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const { skip, take } = getPaginationParams(page);

  const isAdmin = session.user.role === Role.ADMIN;

  // spec FR-007a: Visibility filter
  const whereClause = isAdmin
    ? {}
    : {
        OR: [
          { visibility: 'PUBLIC' as const },
          { submitterId: session.user.id },
        ],
      };

  const [ideas, totalCount] = await Promise.all([
    prisma.idea.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        visibility: true,
        createdAt: true,
        submitter: { select: { id: true, name: true } },
        attachment: { select: { id: true } },
      },
    }),
    prisma.idea.count({ where: whereClause }),
  ]);

  const pagination = buildPaginationMeta(page, totalCount);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ideas Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Browse and track innovation ideas.
            </p>
          </div>
          <Link
            href="/ideas/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Submit Idea
          </Link>
        </div>

        <IdeaList ideas={ideas as any} pagination={pagination} basePath="/dashboard?" />
      </main>
    </>
  );
}
