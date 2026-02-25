import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { IdeaSubmitForm } from '@/components/forms/IdeaSubmitForm';
import { Navbar } from '@/components/layout/Navbar';
import Link from 'next/link';

export default async function NewIdeaPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Submit a New Idea</h1>
          <p className="mt-1 text-sm text-gray-500">
            Share your idea with the organization. You can optionally attach a document.
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <IdeaSubmitForm />
        </div>
      </main>
    </>
  );
}
