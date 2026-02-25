import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { prisma } from '@/lib/db';
import { Role, IdeaStatus } from '@/types';
import Link from 'next/link';

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

  const [statusCounts, totalIdeas, myIdeasCount] = await Promise.all([
    prisma.idea.groupBy({
      by: ['status'],
      where: visibilityFilter,
      _count: { id: true },
    }),
    prisma.idea.count({ where: visibilityFilter }),
    prisma.idea.count({ where: { submitterId: session.user.id } }),
  ]);

  const quickLinks = [
    {
      href: '/ideas/new',
      label: '+ Submit Idea',
      desc: 'Share a new innovation idea',
      highlight: true,
    },
    {
      href: '/my-ideas',
      label: 'My Ideas',
      desc: 'View your submitted and assigned ideas',
      highlight: false,
    },
    {
      href: '/ideas',
      label: 'Browse Ideas',
      desc: 'Explore all ideas with search & filter',
      highlight: false,
    },
    ...(isPrivileged
      ? [
          {
            href: '/admin',
            label: isAdmin ? 'Admin Panel' : 'Inspector Panel',
            desc: 'Review and evaluate submitted ideas',
            highlight: false,
          },
        ]
      : []),
  ];

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

        {/* Quick-action links */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg border p-4 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                link.highlight
                  ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  link.highlight ? 'text-blue-700' : 'text-gray-900'
                }`}
              >
                {link.label}
              </p>
              <p className="mt-1 text-xs text-gray-500">{link.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
