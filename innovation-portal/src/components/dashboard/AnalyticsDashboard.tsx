'use client';

import { IdeaStatus } from '@/types';

interface StatusCount {
  status: IdeaStatus;
  _count: { id: number };
}

interface AnalyticsDashboardProps {
  statusCounts: StatusCount[];
  totalIdeas: number;
  /** If provided, shows user-specific "my submitted count" */
  myIdeasCount?: number;
}

const STATUS_META: Record<
  IdeaStatus,
  { label: string; color: string; bg: string; bar: string }
> = {
  [IdeaStatus.SUBMITTED]: {
    label: 'Submitted',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    bar: 'bg-gray-400',
  },
  [IdeaStatus.UNDER_REVIEW]: {
    label: 'Under Review',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    bar: 'bg-blue-500',
  },
  [IdeaStatus.ACCEPTED]: {
    label: 'Accepted',
    color: 'text-green-700',
    bg: 'bg-green-50',
    bar: 'bg-green-500',
  },
  [IdeaStatus.REJECTED]: {
    label: 'Rejected',
    color: 'text-red-700',
    bg: 'bg-red-50',
    bar: 'bg-red-500',
  },
  [IdeaStatus.INSPECTING]: {
    label: 'Inspecting',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    bar: 'bg-purple-500',
  },
};

export function AnalyticsDashboard({
  statusCounts,
  totalIdeas,
  myIdeasCount,
}: AnalyticsDashboardProps) {
  const countMap = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.id])
  ) as Record<IdeaStatus, number>;

  const statusOrder: IdeaStatus[] = [
    IdeaStatus.SUBMITTED,
    IdeaStatus.UNDER_REVIEW,
    IdeaStatus.ACCEPTED,
    IdeaStatus.REJECTED,
    IdeaStatus.INSPECTING,
  ];

  // Acceptance rate (accepted / (accepted + rejected), expressed as %)
  const accepted = countMap[IdeaStatus.ACCEPTED] ?? 0;
  const rejected = countMap[IdeaStatus.REJECTED] ?? 0;
  const decided = accepted + rejected;
  const acceptanceRate = decided > 0 ? Math.round((accepted / decided) * 100) : null;

  return (
    <div className="space-y-6">
      {/* Summary stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Ideas" value={totalIdeas} color="text-gray-900" />
        {myIdeasCount !== undefined && (
          <StatCard label="My Ideas" value={myIdeasCount} color="text-blue-700" />
        )}
        <StatCard
          label="Accepted"
          value={accepted}
          color="text-green-700"
          subtitle={acceptanceRate !== null ? `${acceptanceRate}% acceptance rate` : undefined}
        />
        <StatCard
          label="Under Review"
          value={countMap[IdeaStatus.UNDER_REVIEW] ?? 0}
          color="text-blue-700"
        />
      </div>

      {/* Status breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Status breakdown
        </h2>
        <div className="space-y-3">
          {statusOrder.map((status) => {
            const count = countMap[status] ?? 0;
            const pct = totalIdeas > 0 ? Math.round((count / totalIdeas) * 100) : 0;
            const meta = STATUS_META[status];
            if (!meta) return null;

            return (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between">
                  <span className={`text-sm font-medium ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {count} &nbsp;
                    <span className="text-xs text-gray-400">({pct}%)</span>
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${meta.bar}`}
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${meta.label}: ${pct}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Small helper ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
