import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { StatusBadge } from '@/components/ideas/StatusBadge';
import { StatusHistory } from '@/components/ideas/StatusHistory';
import { EvaluationForm } from '@/components/forms/EvaluationForm';
import { MediaGallery } from '@/components/ideas/MediaGallery';
import { VideoEmbed } from '@/components/ideas/VideoEmbed';
import { AttachmentList } from '@/components/ideas/AttachmentList';
import { prisma } from '@/lib/db';
import { Role } from '@/types';
import { formatDate } from '@/lib/utils';

interface AdminIdeaPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminIdeaPage({ params }: AdminIdeaPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const isPrivileged = session.user.role === Role.ADMIN || session.user.role === Role.INSPECTOR;
  if (!isPrivileged) redirect('/dashboard');

  const { id } = await params;

  // Lightweight status check before transition
  const stub = await prisma.idea.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!stub) notFound();

  // spec FR-008: auto-transition SUBMITTED → UNDER_REVIEW on admin view
  // BUG-3 FIX: Use updateMany with status guard to prevent duplicate
  // StatusHistory entries from concurrent page loads.
  if (stub.status === 'SUBMITTED') {
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

  // Full fetch including all relations
  const displayIdea = await prisma.idea.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, name: true, email: true } },
      attachments: { orderBy: { displayOrder: 'asc' } }, // Phase 3
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: { admin: { select: { id: true, name: true } } },
      },
    },
  });

  if (!displayIdea) notFound();

  const canEvaluate = ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'].includes(displayIdea.status);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="mb-4 inline-flex items-center text-sm text-blue-600 hover:underline">
          ← Back to Admin List
        </Link>

        {/* Title + Status */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{displayIdea.title}</h1>
          <StatusBadge status={displayIdea.status as any} />
        </div>

        {/* Metadata */}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-medium text-gray-500">Submitted by</dt>
            <dd className="mt-0.5 text-gray-900">
              {displayIdea.submitter?.name ?? 'Account Deleted'}
              {displayIdea.submitter?.email && (
                <span className="ml-1 text-gray-500">({displayIdea.submitter.email})</span>
              )}
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
          <div>
            <dt className="font-medium text-gray-500">Visibility</dt>
            <dd className="mt-0.5 text-gray-900">{displayIdea.visibility}</dd>
          </div>
          {displayIdea.attachments && displayIdea.attachments.length > 0 && (
            <div>
              <dt className="font-medium text-gray-500">Attachments</dt>
              <dd className="mt-0.5 text-gray-900">
                {displayIdea.attachments.length} file{displayIdea.attachments.length > 1 ? 's' : ''}
              </dd>
            </div>
          )}
        </dl>

        {/* Description */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-gray-800 leading-relaxed">
            {displayIdea.description}
          </p>
        </section>

        {/* Phase 3: Media — images gallery, video embeds, file attachments */}
        {(() => {
          const attachmentsBase = `/api/ideas/${displayIdea.id}/attachments`;
          const imageTypes = new Set(['image/png', 'image/jpeg']);
          const images    = displayIdea.attachments.filter((a) => imageTypes.has(a.mimeType));
          const nonImages = displayIdea.attachments.filter((a) => !imageTypes.has(a.mimeType));
          const rawLinks  = displayIdea.videoLinks as Array<{ url: string; title?: string }> | null;
          const videos    = rawLinks ?? [];
          if (images.length === 0 && nonImages.length === 0 && videos.length === 0) return null;
          return (
            <section className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Media &amp; Attachments</h2>
              <MediaGallery images={images} baseUrl={attachmentsBase} />
              <VideoEmbed videos={videos} />
              <AttachmentList attachments={nonImages} baseUrl={attachmentsBase} />
            </section>
          );
        })()}

        {/* Status History */}
        {displayIdea.statusHistory.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Status History
            </h2>
            <StatusHistory history={displayIdea.statusHistory as any} />
          </section>
        )}

        {/* Admin Evaluation */}
        {canEvaluate && (
          <section className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-4 text-base font-semibold text-blue-900">Evaluate Idea</h2>
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
