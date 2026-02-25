'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AssignPipelineProps {
    ideaId: string;
    currentPipelineId: string | null;
    pipelines: {
        id: string;
        name: string;
        stages: { name: string }[];
    }[];
}

export function AssignPipeline({ ideaId, currentPipelineId, pipelines }: AssignPipelineProps) {
    const router = useRouter();
    const [selectedId, setSelectedId] = useState(currentPipelineId ?? '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAssign = async () => {
        if (!selectedId) return;
        setError(null);
        setIsLoading(true);
        try {
            const res = await fetch(`/api/ideas/${ideaId}/assign-pipeline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pipelineId: selectedId }),
            });
            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error ?? 'Failed to assign pipeline.');
            }
        } catch {
            setError('Network error.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const res = await fetch(`/api/ideas/${ideaId}/assign-pipeline`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setSelectedId('');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error ?? 'Failed to remove pipeline.');
            }
        } catch {
            setError('Network error.');
        } finally {
            setIsLoading(false);
        }
    };

    const selectedPipeline = pipelines.find((p) => p.id === selectedId);

    return (
        <div className="space-y-3">
            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <label htmlFor="pipeline-select" className="block text-sm font-medium text-gray-700">
                        Review Pipeline
                    </label>
                    <select
                        id="pipeline-select"
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        disabled={!!currentPipelineId}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                        <option value="">None (simple evaluation)</option>
                        {pipelines.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.stages.length} stages)
                            </option>
                        ))}
                    </select>
                </div>
                {!currentPipelineId ? (
                    <button
                        type="button"
                        onClick={handleAssign}
                        disabled={!selectedId || isLoading}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? '…' : 'Assign'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={isLoading}
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                        {isLoading ? '…' : 'Remove'}
                    </button>
                )}
            </div>

            {selectedPipeline && !currentPipelineId && (
                <p className="text-xs text-gray-500">
                    Stages: {selectedPipeline.stages.map((s) => s.name).join(' → ')}
                </p>
            )}

            {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
        </div>
    );
}
