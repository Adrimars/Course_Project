import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { StatusBadge } from '@/components/ideas/StatusBadge';
import { StatusHistory } from '@/components/ideas/StatusHistory';
import { EvaluationForm } from '@/components/forms/EvaluationForm';
import { VisibilityToggle } from '@/components/ideas/VisibilityToggle';
import { prisma } from '@/lib/db';
import { Role, Visibility } from '@/types';
import { formatDate, formatFileSize } from '@/lib/utils';

interface IdeaDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IdeaDetailPage({ params }: IdeaDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { id } = await params;

  // Lightweight fetch for visibility / status check
  const stub = await prisma.idea.findUnique({
    where: { id },
    select: { id: true, submitterId: true, status: true, visibility: true },
  });

  if (!stub) notFound();

  const isAdmin = session.user.role === Role.ADMIN;
  const isOwner = stub.submitterId === session.user.id;

  // spec FR-007b: PRIVATE idea only visible to submitter or admin
  if (stub.visibility === Visibility.PRIVATE && !isOwner && !isAdmin) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-500">This idea is private.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </main>
      </>
    );
  }

  // spec FR-008: auto-transition SUBMITTED → UNDER_REVIEW on admin view
  // BUG-3 FIX: Use updateMany with status guard to prevent duplicate
  // StatusHistory entries from concurrent page loads.
  if (isAdmin && stub.status === 'SUBMITTED') {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.idea.updateMany({
        where: { id, status: 'SUBMITTED' },
        data: { status: 'UNDER_REVIEW' },
      });
      if (updated.count > 0) {
        await tx.statusHistory.create({
          data: {
            ideaId: id,
            fromStatus: 'SUBMITTED',
            toStatus: 'UNDER_REVIEW',
            adminId: session.user.id,
            feedback: 'Opened by administrator for review.',
          },
        });
      }
    });
  }

  // Full fetch with all relations
  const displayIdea = await prisma.idea.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, name: true, email: true } },
      attachment: true,
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: { admin: { select: { id: true, name: true } } },
      },
    },
  });

  if (!displayIdea) notFound();

  const canSeeHistory = isOwner || isAdmin;
  const canEvaluate =
    isAdmin && ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'].includes(displayIdea.status);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Back link */}
        <Link href="/dashboard" className="mb-4 inline-flex items-center text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>

        {/* 1. Title + Status */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{displayIdea.title}</h1>
          <StatusBadge status={displayIdea.status as any} />
        </div>

        {/* 2. Metadata */}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-medium text-gray-500">Submitted by</dt>
            <dd className="mt-0.5 text-gray-900">
              {displayIdea.submitter?.name ?? 'Account Deleted'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Submitted on</dt>
            <dd className="mt-0.5 text-gray-900">{formatDate(displayIdea.createdAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Category</dt>
            <dd className="mt-0.5 capitalize text-gray-900">
              {displayIdea.category.replace(/_/g, ' ').toLowerCase()}
            </dd>
          </div>
          {displayIdea.attachment && (
            <div>
              <dt className="font-medium text-gray-500">Attachment</dt>
              <dd className="mt-0.5 flex items-center gap-1 text-gray-900">
                <span>📎</span>
                <span>{formatFileSize(displayIdea.attachment.size)}</span>
              </dd>
            </div>
          )}
        </dl>

        {/* 3. Description */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-gray-800 leading-relaxed">
            {displayIdea.description}
          </p>
        </section>

        {/* 4. Attachment download */}
        {displayIdea.attachment && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Attachment</h2>
            <a
              href={`/api/ideas/${displayIdea.id}/attachment`}
              download
              className="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              📁 {displayIdea.attachment.originalName} ({formatFileSize(displayIdea.attachment.size)})
            </a>
          </section>
        )}

        {/* 5. Visibility toggle (submitter only) */}
        {isOwner && (
          <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Visibility
            </h2>
            <VisibilityToggle
              ideaId={displayIdea.id}
              currentVisibility={displayIdea.visibility as 'PUBLIC' | 'PRIVATE'}
            />
          </section>
        )}

        {/* 6. Status History (submitter + admin) */}
        {canSeeHistory && displayIdea.statusHistory.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Status History
            </h2>
            <StatusHistory history={displayIdea.statusHistory as any} />
          </section>
        )}

        {/* 7. Admin evaluation panel */}
        {canEvaluate && (
          <section className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-4 text-base font-semibold text-blue-900">Admin Evaluation</h2>
            <EvaluationForm
              ideaId={displayIdea.id}
              currentStatus={displayIdea.status as any}
              currentUpdatedAt={displayIdea.updatedAt.toISOString()}
            />
          </section>
        )}
      </main>
    </>
  );
}
