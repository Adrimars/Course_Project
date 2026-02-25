import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { StatusBadge } from '@/components/ideas/StatusBadge';
import { prisma } from '@/lib/db';
import { Role } from '@/types';
import { formatDate } from '@/lib/utils';

export default async function MyAssignmentsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');
    const isPrivileged = session.user.role === Role.ADMIN || session.user.role === Role.INSPECTOR;
    if (!isPrivileged) redirect('/dashboard');

    // Find all review stages assigned to this user, and their associated ideas
    const myStages = await prisma.reviewStage.findMany({
        where: { reviewerId: session.user.id },
        include: {
            pipeline: {
                include: {
                    ideas: {
                        where: { status: 'UNDER_REVIEW' },
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            currentStageOrder: true,
                            createdAt: true,
                            submitter: { select: { name: true } },
                        },
                    },
                },
            },
        },
        orderBy: { stageOrder: 'asc' },
    });

    // Build a flat list of ideas where this user is the reviewer for the CURRENT stage
    const assignments: {
        ideaId: string;
        ideaTitle: string;
        ideaStatus: string;
        submitterName: string;
        createdAt: Date;
        pipelineName: string;
        stageName: string;
        stageOrder: number;
    }[] = [];

    for (const stage of myStages) {
        for (const idea of stage.pipeline.ideas) {
            if (idea.currentStageOrder === stage.stageOrder) {
                assignments.push({
                    ideaId: idea.id,
                    ideaTitle: idea.title,
                    ideaStatus: idea.status,
                    submitterName: idea.submitter?.name ?? 'Unknown',
                    createdAt: idea.createdAt,
                    pipelineName: stage.pipeline.name,
                    stageName: stage.name,
                    stageOrder: stage.stageOrder,
                });
            }
        }
    }

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Ideas where you are the assigned reviewer for the current stage.
                </p>

                {assignments.length === 0 ? (
                    <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
                        <p className="text-gray-500">No ideas are currently waiting for your review.</p>
                    </div>
                ) : (
                    <div className="mt-6 space-y-3">
                        {assignments.map((a) => (
                            <Link
                                key={a.ideaId}
                                href={`/ideas/${a.ideaId}`}
                                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="text-base font-semibold text-gray-900 truncate">
                                            {a.ideaTitle}
                                        </h2>
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            by {a.submitterName} · {formatDate(a.createdAt)}
                                        </p>
                                    </div>
                                    <StatusBadge status={a.ideaStatus} />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded bg-teal-100 px-2 py-0.5 font-medium text-teal-700">
                                        Stage {a.stageOrder}: {a.stageName}
                                    </span>
                                    <span className="text-gray-400">in</span>
                                    <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                                        {a.pipelineName}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
