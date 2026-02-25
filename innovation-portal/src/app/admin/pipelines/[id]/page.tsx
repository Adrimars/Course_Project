import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { PipelineForm } from '@/components/admin/PipelineForm';
import { prisma } from '@/lib/db';
import { Role } from '@/types';

interface EditPipelinePageProps {
    params: Promise<{ id: string }>;
}

export default async function EditPipelinePage({ params }: EditPipelinePageProps) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');
    if (session.user.role !== Role.ADMIN) redirect('/dashboard');

    const { id } = await params;

    const pipeline = await prisma.reviewPipeline.findUnique({
        where: { id },
        include: {
            stages: {
                orderBy: { stageOrder: 'asc' },
                include: { reviewer: { select: { id: true, name: true } } },
            },
        },
    });

    if (!pipeline) notFound();

    const reviewers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'INSPECTOR'] } },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
    });

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
                <Link
                    href="/admin/pipelines"
                    className="mb-4 inline-flex items-center text-sm text-blue-600 hover:underline"
                >
                    ← Back to Pipelines
                </Link>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Pipeline: {pipeline.name}</h1>
                <div className="mt-6">
                    <PipelineForm
                        pipelineId={pipeline.id}
                        initialName={pipeline.name}
                        initialDescription={pipeline.description ?? ''}
                        initialStages={pipeline.stages.map((s) => ({
                            name: s.name,
                            description: s.description ?? '',
                            reviewerId: s.reviewerId ?? '',
                        }))}
                        reviewers={reviewers}
                    />
                </div>
            </main>
        </>
    );
}
