import { StatusBadge } from './StatusBadge';
import { formatDate } from '@/lib/utils';
import { StatusHistoryEntry } from '@/types';

interface StatusHistoryProps {
  history: StatusHistoryEntry[];
}

/**
 * T038 / spec CHK015: Renders an ordered list of status changes.
 * Each entry shows: timestamp, actor name (or "System"), old→new badges,
 * and full feedback comments text.
 */
export function StatusHistory({ history }: StatusHistoryProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No status changes yet.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {history.map((entry) => (
        <li
          key={entry.id}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          {/* Row 1: Actor + timestamp */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">
              {/* spec CHK015: System transition shows "System", admin shows their name */}
              {entry.admin?.name ?? 'System'}
            </span>
            <span>·</span>
            <time dateTime={new Date(entry.createdAt).toISOString()}>
              {formatDate(entry.createdAt)}
            </time>
          </div>

          {/* Row 2: Status transition badges */}
          <div className="mt-2 flex items-center gap-2 text-sm">
            {entry.fromStatus ? (
              <>
                <StatusBadge status={entry.fromStatus} />
                <span className="text-gray-400" aria-label="changed to">→</span>
              </>
            ) : null}
            <StatusBadge status={entry.toStatus} />
          </div>

          {/* Row 3: Feedback comments */}
          {entry.feedback && (
            <blockquote className="mt-2 border-l-2 border-blue-400 pl-3 text-sm text-gray-700">
              {entry.feedback}
            </blockquote>
          )}
        </li>
      ))}
    </ol>
  );
}
