'use client';

import Link from 'next/link';

type NotificationItem = {
    id: string;
    ideaTitle: string;
    fromStatus: string | null;
    toStatus: string;
    feedback: string | null;
    actorName: string;
    createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    INSPECTING: 'bg-purple-100 text-purple-700',
    DRAFT: 'bg-gray-100 text-gray-600',
};

function formatStatus(status: string) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function MiniNotifications({ items }: { items: NotificationItem[] }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🔔</span>
                    <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                    {items.length > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {items.length}
                        </span>
                    )}
                </div>
                <Link
                    href="/notifications"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                    View all →
                </Link>
            </div>

            {/* Items */}
            {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-400">No recent activity</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {items.map((item) => (
                        <div key={item.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-800">
                                        {item.ideaTitle}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        {item.fromStatus && (
                                            <>
                                                <span
                                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[item.fromStatus] || 'bg-gray-100 text-gray-600'}`}
                                                >
                                                    {formatStatus(item.fromStatus)}
                                                </span>
                                                <span className="text-gray-400">→</span>
                                            </>
                                        )}
                                        <span
                                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[item.toStatus] || 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {formatStatus(item.toStatus)}
                                        </span>
                                    </div>
                                    {item.feedback && (
                                        <p className="mt-1 truncate text-xs text-gray-500 italic">
                                            &quot;{item.feedback}&quot;
                                        </p>
                                    )}
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-[10px] text-gray-400">{timeAgo(item.createdAt)}</p>
                                    <p className="mt-0.5 text-[10px] text-gray-400">{item.actorName}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
