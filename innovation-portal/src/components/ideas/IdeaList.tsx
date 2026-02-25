'use client';

import Link from 'next/link';
import { IdeaCard } from './IdeaCard';
import { IdeaSummary, PaginationMeta } from '@/types';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface IdeaListProps {
  ideas: IdeaSummary[];
  pagination: PaginationMeta;
  basePath?: string;
}

/**
 * T033: Paginated list of IdeaCards.
 * spec FR-016: Server-side pagination, 20 ideas/page, prev/next controls,
 * page indicator ("Page 2 of 7"), disabled at boundaries.
 */
export function IdeaList({ ideas, pagination, basePath = '?' }: IdeaListProps) {
  const router = useRouter();

  const { page, totalPages, totalCount, hasNext, hasPrev } = pagination;

  const goToPage = (p: number) => {
    router.push(`${basePath}page=${p}`);
  };

  return (
    <div className="space-y-4">
      {/* Total count */}
      <p className="text-sm text-gray-500">
        {totalCount} {totalCount === 1 ? 'idea' : 'ideas'} total
      </p>

      {/* Idea cards */}
      {ideas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No ideas found.{' '}
          <Link href="/ideas/new" className="text-blue-600 hover:underline">
            Submit one
          </Link>
          !
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <IdeaCard idea={idea} />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between border-t border-gray-200 pt-4"
          role="navigation"
          aria-label="Pagination"
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasPrev}
            onClick={() => goToPage(page - 1)}
            aria-label="Previous page"
          >
            ← Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasNext}
            onClick={() => goToPage(page + 1)}
            aria-label="Next page"
          >
            Next →
          </Button>
        </div>
      )}

      {/* spec CHK022: Static refresh note — no real-time updates in MVP */}
      <p className="text-center text-xs text-gray-400">
        Refresh the page to see the latest updates.
      </p>
    </div>
  );
}
