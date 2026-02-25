import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { InlineStatusControl } from '@/components/ideas/InlineStatusControl';
import { StatusHistory } from '@/components/ideas/StatusHistory';
import { VisibilityToggle } from '@/components/ideas/VisibilityToggle';
import { NoteList } from '@/components/ideas/NoteList';
import { AssignmentSection } from '@/components/ideas/AssignmentSection';
import { JoinRequestButton } from '@/components/ideas/JoinRequestButton';
import { JoinRequestsPanel } from '@/components/ideas/JoinRequestsPanel';
import { MediaGallery } from '@/components/ideas/MediaGallery';
import { VideoEmbed } from '@/components/ideas/VideoEmbed';
import { AttachmentList } from '@/components/ideas/AttachmentList';
import { DraftActions } from '@/components/ideas/DraftActions';
import { prisma } from '@/lib/db';
import { Role, Visibility } from '@/types';
import { formatDate } from '@/lib/utils';
import { CATEGORY_FIELDS } from '@/lib/validations/idea';

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
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;
  const isOwner = stub.submitterId === session.user.id;

  // spec FR-007b: PRIVATE idea only visible to submitter, admin, or inspector
  // INSPECTING ideas are hidden from regular users
  // Phase 4: DRAFT ideas only visible to owner
  if (
    (stub.status === 'DRAFT' && !isOwner) ||
    (stub.visibility === Visibility.PRIVATE && !isOwner && !isPrivileged) ||
    (stub.status === 'INSPECTING' && !isPrivileged)
  ) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-500">This idea is not accessible.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </main>
      </>
    );
  }

  // spec FR-008: auto-transition removed — all status changes are now manual.
  // Admin/inspector evaluation form will show the SUBMITTED→UNDER_REVIEW option.

  // Full fetch with all relations
  const displayIdea = await prisma.idea.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, name: true, email: true } },
      attachments: { orderBy: { displayOrder: 'asc' } }, // Phase 3: multiple
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: { admin: { select: { id: true, name: true } } },
      },
    },
  });

  if (!displayIdea) notFound();

  const canSeeHistory = isOwner || isAdmin;
  const isDraft = displayIdea.status === 'DRAFT';
  const canEvaluate =
    !isDraft &&
    (isAdmin || isInspector) &&
    ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'INSPECTING'].includes(displayIdea.status);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Back link */}
        <Link href="/my-ideas?tab=drafts" className={`mb-4 inline-flex items-center text-sm text-blue-600 hover:underline ${!isDraft ? 'hidden' : ''}`}>
          ← Back to My Drafts
        </Link>
        <Link href="/dashboard" className={`mb-4 inline-flex items-center text-sm text-blue-600 hover:underline ${isDraft ? 'hidden' : ''}`}>
          ← Back to Dashboard
        </Link>

        {/* Phase 4: Draft banner with actions */}
        {isDraft && isOwner && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div>
              <p className="text-sm font-semibold text-yellow-800">📝 This idea is a Draft</p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Not yet submitted. Only you can see it. Complete and submit when ready.
              </p>
            </div>
            <DraftActions ideaId={displayIdea.id} />
          </div>
        )}

        {/* 1. Title + Status */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{displayIdea.title}</h1>
          <InlineStatusControl
            ideaId={displayIdea.id}
            currentStatus={displayIdea.status}
            currentUpdatedAt={displayIdea.updatedAt.toISOString()}
            isPrivileged={isPrivileged}
          />
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
          {displayIdea.attachments && displayIdea.attachments.length > 0 && (
            <div>
              <dt className="font-medium text-gray-500">Attachments</dt>
              <dd className="mt-0.5 text-gray-900">
                {displayIdea.attachments.length} file{displayIdea.attachments.length > 1 ? 's' : ''}
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

        {/* 4. Category-specific metadata (Phase 2) */}
        {displayIdea.metadata && typeof displayIdea.metadata === 'object' && (() => {
          const meta = displayIdea.metadata as Record<string, string>;
          const fields = CATEGORY_FIELDS[displayIdea.category] ?? [];
          const entries = fields
            .map((f) => ({ label: f.label, value: meta[f.key] }))
            .filter((e) => e.value && e.value.trim() !== '');
          if (entries.length === 0) return null;
          return (
            <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600">
                {displayIdea.category.replace(/_/g, ' ')} Details
              </h2>
              <dl className="space-y-2">
                {entries.map(({ label, value }) => (
                  <div key={label} className="grid grid-cols-3 gap-2 text-sm">
                    <dt className="font-medium text-gray-500 col-span-1">{label}</dt>
                    <dd className="text-gray-900 col-span-2">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })()}

        {/* 5. Phase 3: Media — images gallery, video embeds, file attachments */}
        {(() => {
          const attachmentsBase = `/api/ideas/${displayIdea.id}/attachments`;
          const imageTypes = new Set(['image/png', 'image/jpeg']);
          const images    = displayIdea.attachments.filter((a) => imageTypes.has(a.mimeType));
          const nonImages = displayIdea.attachments.filter((a) => !imageTypes.has(a.mimeType));
          // Phase 3: parse stored videoLinks JSON
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

        {/* 8. Notes (visible for non-draft ideas) */}
        {!isDraft && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
            <NoteList
              ideaId={displayIdea.id}
              currentUserId={session.user.id}
              canCollaborate={isPrivileged}
            />
          </div>
        )}

        {/* 9. Assignments (admin/inspector view, non-draft only) */}
        {isPrivileged && !isDraft && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
            <AssignmentSection
              ideaId={displayIdea.id}
              currentUserId={session.user.id}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* 10. Join request button (non-owner, non-private, non-draft ideas) */}
        {!isOwner && !isDraft && displayIdea.visibility !== 'PRIVATE' && (
          <div className="mt-4">
            <JoinRequestButton ideaId={displayIdea.id} isOwner={isOwner} />
          </div>
        )}

        {/* 11. Pending join requests panel (idea owner + admins, non-draft) */}
        {(isOwner || isAdmin) && !isDraft && (
          <JoinRequestsPanel ideaId={displayIdea.id} />
        )}
      </main>
    </>
  );
}
