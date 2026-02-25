'use client';

import { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
    title: string;
    defaultOpen?: boolean;
    children: ReactNode;
    badge?: string;
}

export function CollapsibleSection({
    title,
    defaultOpen = false,
    children,
    badge,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    {badge && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {badge}
                        </span>
                    )}
                </div>
                <svg
                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && <div className="border-t border-gray-200 px-6 py-4">{children}</div>}
        </div>
    );
}
