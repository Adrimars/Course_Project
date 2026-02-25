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
    <ol className="space-y-2">
      {history.map((entry) => (
        <li
          key={entry.id}
          className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
        >
          {/* Compact: actor, timestamp, badges all on one row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-medium text-gray-700">
              {entry.admin?.name ?? 'System'}
            </span>
            <span className="text-gray-300">·</span>
            <time className="text-gray-400" dateTime={new Date(entry.createdAt).toISOString()}>
              {formatDate(entry.createdAt)}
            </time>
            <span className="text-gray-300">·</span>
            {entry.fromStatus && (
              <>
                <StatusBadge status={entry.fromStatus} />
                <span className="text-gray-400" aria-label="changed to">→</span>
              </>
            )}
            <StatusBadge status={entry.toStatus} />
          </div>

          {/* Feedback — smaller */}
          {entry.feedback && (
            <p className="mt-1 border-l-2 border-blue-300 pl-2 text-xs text-gray-600">
              {entry.feedback}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
