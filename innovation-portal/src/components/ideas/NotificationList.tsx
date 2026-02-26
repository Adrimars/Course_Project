'use client';

import { useState } from 'react';
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

type NotificationListProps = {
    initialItems: NotificationItem[];
    initialPagination: {
        page: number;
        totalPages: number;
        totalCount: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
};

const TYPE_ICONS: Record<string, string> = {
    STATUS_CHANGE: '🔄',
    ASSIGNMENT: '📋',
    JOIN_REQUEST: '🤝',
    SCORE_RECEIVED: '⭐',
    FEEDBACK: '💬',
    SYSTEM: '🔔',
};

const TYPE_COLORS: Record<string, string> = {
    STATUS_CHANGE: 'bg-blue-100 text-blue-700',
    ASSIGNMENT: 'bg-purple-100 text-purple-700',
    JOIN_REQUEST: 'bg-green-100 text-green-700',
    SCORE_RECEIVED: 'bg-amber-100 text-amber-700',
    FEEDBACK: 'bg-pink-100 text-pink-700',
    SYSTEM: 'bg-gray-100 text-gray-600',
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export function NotificationList({ initialItems, initialPagination }: NotificationListProps) {
    const [items, setItems] = useState(initialItems);
    const [pagination, setPagination] = useState(initialPagination);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [loading, setLoading] = useState(false);

    const fetchPage = async (page: number, unreadOnly: boolean) => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? sessionStorage.getItem('tab-token') : null;
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(
                `/api/notifications?page=${page}${unreadOnly ? '&unreadOnly=true' : ''}`,
                { headers }
            );
            if (res.ok) {
                const data = await res.json();
                setItems(data.data);
                setPagination(data.pagination);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const token = typeof window !== 'undefined' ? sessionStorage.getItem('tab-token') : null;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers });
            setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        } catch {
            // silent
        }
    };

    const markAllRead = async () => {
        try {
            const token = typeof window !== 'undefined' ? sessionStorage.getItem('tab-token') : null;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            await fetch('/api/notifications', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ markAllRead: true }),
            });
            setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch {
            // silent
        }
    };

    const handleFilterChange = (newFilter: 'all' | 'unread') => {
        setFilter(newFilter);
        fetchPage(1, newFilter === 'unread');
    };

    const unreadCount = items.filter((n) => !n.isRead).length;

    return (
        <div>
            {/* Controls */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => handleFilterChange('all')}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => handleFilterChange('unread')}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'unread'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Unread
                    </button>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {/* List */}
            {loading ? (
                <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                    <span className="text-3xl">🔔</span>
                    <p className="mt-3 text-sm text-gray-500">
                        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`flex items-start gap-3 px-4 py-3 transition-colors ${!item.isRead ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                                }`}
                        >
                            {/* Icon */}
                            <span className="mt-0.5 flex-shrink-0 text-lg">
                                {TYPE_ICONS[item.type] || '🔔'}
                            </span>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[item.type] || 'bg-gray-100 text-gray-600'}`}>
                                        {item.type.replace(/_/g, ' ')}
                                    </span>
                                    {!item.isRead && (
                                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    )}
                                </div>
                                <p className="mt-1 text-sm font-medium text-gray-800">{item.title}</p>
                                <p className="mt-0.5 text-xs text-gray-500">{item.message}</p>
                                <div className="mt-1.5 flex items-center gap-3">
                                    <span className="text-[10px] text-gray-400">{timeAgo(item.createdAt)}</span>
                                    {item.link && (
                                        <Link
                                            href={item.link}
                                            className="text-[10px] font-medium text-blue-600 hover:underline"
                                        >
                                            View →
                                        </Link>
                                    )}
                                    {!item.isRead && (
                                        <button
                                            onClick={() => markAsRead(item.id)}
                                            className="text-[10px] font-medium text-gray-400 hover:text-gray-600"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <button
                        onClick={() => fetchPage(pagination.page - 1, filter === 'unread')}
                        disabled={!pagination.hasPrev}
                        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                    >
                        ← Previous
                    </button>
                    <span className="text-xs text-gray-500">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
                    </span>
                    <button
                        onClick={() => fetchPage(pagination.page + 1, filter === 'unread')}
                        disabled={!pagination.hasNext}
                        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
