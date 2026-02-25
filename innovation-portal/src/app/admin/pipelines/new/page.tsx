import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { PipelineForm } from '@/components/admin/PipelineForm';
import { prisma } from '@/lib/db';
import { Role } from '@/types';

export default async function NewPipelinePage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');
    if (session.user.role !== Role.ADMIN) redirect('/dashboard');

    // Fetch eligible reviewers (ADMIN and INSPECTOR users)
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
                <h1 className="mt-2 text-2xl font-bold text-gray-900">Create Review Pipeline</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Define stages and assign reviewers for structured idea evaluation.
                </p>
                <div className="mt-6">
                    <PipelineForm reviewers={reviewers} />
                </div>
            </main>
        </>
    );
}
