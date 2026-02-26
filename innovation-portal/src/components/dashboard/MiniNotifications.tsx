'use client';

import Link from 'next/link';

type NotificationItem = {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
};

const TYPE_ICONS: Record<string, string> = {
    STATUS_CHANGE: '🔄',
    ASSIGNMENT: '📋',
    JOIN_REQUEST: '🤝',
    SCORE_RECEIVED: '⭐',
    FEEDBACK: '💬',
    SYSTEM: '🔔',
};

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
                    {items.filter((n) => !n.isRead).length > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {items.filter((n) => !n.isRead).length} new
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
                        <div
                            key={item.id}
                            className={`px-4 py-3 transition-colors ${!item.isRead ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm">{TYPE_ICONS[item.type] || '🔔'}</span>
                                        <p className="truncate text-sm font-medium text-gray-800">
                                            {item.title}
                                        </p>
                                        {!item.isRead && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-gray-500">
                                        {item.message}
                                    </p>
                                </div>
                                <p className="flex-shrink-0 text-[10px] text-gray-400">{timeAgo(item.createdAt)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
