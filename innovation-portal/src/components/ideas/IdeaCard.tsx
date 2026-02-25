import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '@/lib/utils';
import { IdeaSummary } from '@/types';

interface IdeaCardProps {
  idea: IdeaSummary;
}

/**
 * T032 / T048: Displays idea summary. Handles null submitter (Account Deleted).
 */
export function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <Link
      href={`/ideas/${idea.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {idea.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {/* spec T048: Handle deleted submitter */}
            <span>
              {idea.submitter?.name ?? (
                <span className="italic text-gray-400">Account Deleted</span>
              )}
            </span>
            <span>·</span>
            <span>{formatDate(idea.createdAt)}</span>
            <span>·</span>
            <span className="capitalize">{idea.category.replace('_', ' ').toLowerCase()}</span>
            {idea.visibility === 'PRIVATE' && (
              <>
                <span>·</span>
                <span className="text-amber-600">🔒 Private</span>
              </>
            )}
            {idea.attachment && (
              <>
                <span>·</span>
                <span className="text-blue-600">📎</span>
              </>
            )}
          </div>
        </div>
        <StatusBadge status={idea.status} />
      </div>
    </Link>
  );
}
