import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { IdeaList } from '@/components/ideas/IdeaList';
import { SearchAndFilter } from '@/components/ideas/SearchAndFilter';
import { prisma } from '@/lib/db';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils';
import { Role, IdeaStatus } from '@/types';
import Link from 'next/link';

interface BrowseIdeasPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    category?: string;
    visibility?: string;
  }>;
}

export default async function BrowseIdeasPage({ searchParams }: BrowseIdeasPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { page: pageParam, search, status, category, visibility } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const { skip, take } = getPaginationParams(page);

  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  const accessFilter = isPrivileged
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

  const searchConditions: Record<string, unknown>[] = [];
  if (search?.trim()) {
    searchConditions.push({
      OR: [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ],
    });
  }
  if (status) searchConditions.push({ status });
  if (category) searchConditions.push({ category });
  if (visibility) searchConditions.push({ visibility });

  const whereClause =
    searchConditions.length > 0
      ? { AND: [accessFilter, ...searchConditions] }
      : accessFilter;

  const [ideas, totalCount] = await Promise.all([
    prisma.idea.findMany({
      where: whereClause as any,
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
        attachments: { select: { id: true }, orderBy: { displayOrder: 'asc' } }, // Phase 3
      },
    }),
    prisma.idea.count({ where: whereClause as any }),
  ]);

  const pagination = buildPaginationMeta(page, totalCount);

  // Build basePath preserving current filters
  const filterParams = new URLSearchParams();
  if (search) filterParams.set('search', search);
  if (status) filterParams.set('status', status);
  if (category) filterParams.set('category', category);
  if (visibility) filterParams.set('visibility', visibility);
  const filterString = filterParams.toString();
  const basePath = filterString ? `/ideas?${filterString}&` : '/ideas?';

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse Ideas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Explore innovation ideas from across the organisation.
            </p>
          </div>
          <Link
            href="/ideas/new"
            className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Submit Idea
          </Link>
        </div>

        {/* Search & filter */}
        <div className="mb-4">
          <Suspense>
            <SearchAndFilter
              showStatusFilter
              showVisibilityFilter={isPrivileged}
            />
          </Suspense>
        </div>

        {/* Results */}
        <IdeaList ideas={ideas as any} pagination={pagination} basePath={basePath} />
      </main>
    </>
  );
}
