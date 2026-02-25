import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { IdeaList } from '@/components/ideas/IdeaList';
import { prisma } from '@/lib/db';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils';
import { Role } from '@/types';

interface AdminPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== Role.ADMIN) redirect('/dashboard');

  const { page: pageParam, status: statusFilter } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const { skip, take } = getPaginationParams(page);

  const whereClause: Record<string, unknown> = {};
  if (statusFilter) whereClause.status = statusFilter;

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

  const statuses = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin — All Ideas</h1>
          <p className="mt-1 text-sm text-gray-500">Review and evaluate submitted ideas.</p>
        </div>

        {/* Status filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          <a
            href="/admin"
            className={`rounded-full px-3 py-1 text-xs font-medium ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            All
          </a>
          {statuses.map((s) => (
            <a
              key={s}
              href={`/admin?status=${s}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {s.replace(/_/g, ' ')}
            </a>
          ))}
        </div>

        <IdeaList ideas={ideas as any} pagination={pagination} basePath={statusFilter ? `/admin?status=${statusFilter}&` : '/admin?'} />
      </main>
    </>
  );
}
