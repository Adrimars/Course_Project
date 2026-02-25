import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { IdeaList } from '@/components/ideas/IdeaList';
import { prisma } from '@/lib/db';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils';
import { Role, IdeaStatus } from '@/types';
import { IdeaStatus as PrismaStatus } from '@prisma/client';
import Link from 'next/link';

interface MyIdeasPageProps {
  searchParams: Promise<{ page?: string; tab?: string }>;
}

export default async function MyIdeasPage({ searchParams }: MyIdeasPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { page: pageParam, tab: tabParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const { skip, take } = getPaginationParams(page);

  const userId = session.user.id;
  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  // Tabs: 'submitted' | 'assigned' | 'inspecting' (privileged only) | 'drafts'
  const validTabs = ['submitted', 'assigned', 'drafts', ...(isPrivileged ? ['inspecting'] : [])];
  const activeTab = validTabs.includes(tabParam ?? '') ? tabParam! : 'submitted';

  let whereClause: Record<string, unknown> = {};

  if (activeTab === 'submitted') {
    whereClause = { submitterId: userId, status: { not: PrismaStatus.DRAFT } };
  } else if (activeTab === 'drafts') {
    whereClause = { submitterId: userId, status: PrismaStatus.DRAFT };
  } else if (activeTab === 'assigned') {
    // Ideas assigned to this user (via Assignment model)
    whereClause = {
      assignments: {
        some: {
          assigneeId: userId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      },
    };
  } else if (activeTab === 'inspecting') {
    whereClause = { status: IdeaStatus.INSPECTING };
  }

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
        attachments: { select: { id: true }, orderBy: { displayOrder: 'asc' } }, // Phase 3
      },
    }),
    prisma.idea.count({ where: whereClause }),
  ]);

  const pagination = buildPaginationMeta(page, totalCount);
  const basePath = `/my-ideas?tab=${activeTab}&`;

  const tabs = [
    { key: 'submitted', label: 'Submitted by me' },
    { key: 'drafts',    label: 'My Drafts' },
    { key: 'assigned', label: 'Assigned to me' },
    ...(isPrivileged ? [{ key: 'inspecting', label: 'Inspecting' }] : []),
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Ideas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Ideas you&apos;ve submitted, been assigned to, or are currently inspecting.
            </p>
          </div>
          <Link
            href="/ideas/new"
            className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Submit Idea
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/my-ideas?tab=${tab.key}`}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Idea list */}
        <IdeaList ideas={ideas as any} pagination={pagination} basePath={basePath} />
      </main>
    </>
  );
}
