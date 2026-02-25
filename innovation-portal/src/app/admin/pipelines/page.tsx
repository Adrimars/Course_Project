import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { prisma } from '@/lib/db';
import { Role } from '@/types';

export default async function PipelinesPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');
    if (session.user.role !== Role.ADMIN) redirect('/dashboard');

    const pipelines = await prisma.reviewPipeline.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            stages: {
                orderBy: { stageOrder: 'asc' },
                include: {
                    reviewer: { select: { id: true, name: true } },
                },
            },
            _count: { select: { ideas: true } },
        },
    });

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Review Pipelines</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage multi-stage review workflows for idea evaluation.
                        </p>
                    </div>
                    <Link
                        href="/admin/pipelines/new"
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        + New Pipeline
                    </Link>
                </div>

                {pipelines.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
                        <p className="text-gray-500">No pipelines created yet.</p>
                        <Link
                            href="/admin/pipelines/new"
                            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                        >
                            Create your first pipeline →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pipelines.map((pipeline) => (
                            <div
                                key={pipeline.id}
                                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-semibold text-gray-900">
                                                {pipeline.name}
                                            </h2>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${pipeline.isActive
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                    }`}
                                            >
                                                {pipeline.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {pipeline.description && (
                                            <p className="mt-1 text-sm text-gray-500">{pipeline.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-500">
                                            {pipeline._count.ideas} idea{pipeline._count.ideas !== 1 ? 's' : ''}
                                        </span>
                                        <Link
                                            href={`/admin/pipelines/${pipeline.id}`}
                                            className="rounded-md border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50"
                                        >
                                            Edit
                                        </Link>
                                    </div>
                                </div>

                                {/* Stage summary */}
                                <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                                    {pipeline.stages.map((stage, i) => (
                                        <span key={stage.id} className="flex items-center gap-1">
                                            <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                                                {stage.name}
                                            </span>
                                            {stage.reviewer && (
                                                <span className="text-gray-400">({stage.reviewer.name})</span>
                                            )}
                                            {i < pipeline.stages.length - 1 && (
                                                <span className="mx-1 text-gray-300">→</span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
