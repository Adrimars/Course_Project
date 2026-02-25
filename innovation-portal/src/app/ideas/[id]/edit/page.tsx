import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { IdeaSubmitForm } from '@/components/forms/IdeaSubmitForm';
import { prisma } from '@/lib/db';

interface EditDraftPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Phase 4: Edit page for DRAFT ideas.
 * Only accessible by the idea owner. Non-DRAFTs → 404.
 */
export default async function EditDraftPage({ params }: EditDraftPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const { id } = await params;

  const idea = await prisma.idea.findUnique({
    where: { id },
    include: { attachments: { orderBy: { displayOrder: 'asc' } } },
  });

  // Must exist, be a DRAFT, and belong to the current user
  if (!idea || idea.status !== 'DRAFT' || idea.submitterId !== session.user.id) {
    notFound();
  }

  const initialValues = {
    title: idea.title ?? '',
    description: idea.description ?? '',
    category: (idea.category as string) ?? '',
    visibility: idea.visibility as 'PUBLIC' | 'PRIVATE',
    metadata: (idea.metadata as Record<string, string> | null) ?? undefined,
    videoLinks:
      (idea.videoLinks as Array<{ url: string; title: string }> | null) ?? undefined,
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <a
            href={`/ideas/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to draft
          </a>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Draft</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your changes are saved automatically when you click &quot;Save as Draft&quot;.
            Click &quot;Submit Idea&quot; when you&apos;re ready to publish.
          </p>
        </div>

        <IdeaSubmitForm draftId={id} initialValues={initialValues} />
      </main>
    </>
  );
}
