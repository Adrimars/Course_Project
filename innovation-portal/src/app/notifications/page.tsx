import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';

export default async function NotificationsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">🔔 Notifications</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Stay updated on status changes, feedback, and activity on your ideas.
                    </p>
                </div>

                {/* Coming Soon Card */}
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                        <span className="text-3xl">🔔</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-700">Coming Soon</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                        Notifications will let you know when your ideas receive feedback,
                        change status, or get scored by reviewers. This feature is currently
                        under development.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                            Status Updates
                        </span>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Review Feedback
                        </span>
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                            Pipeline Progress
                        </span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            Assignments
                        </span>
                    </div>
                </div>
            </main>
        </>
    );
}
