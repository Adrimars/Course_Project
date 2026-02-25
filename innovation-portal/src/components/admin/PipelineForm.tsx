'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface StageInput {
    name: string;
    description: string;
    reviewerId: string;
}

interface PipelineFormProps {
    initialName?: string;
    initialDescription?: string;
    initialStages?: StageInput[];
    pipelineId?: string; // if editing
    reviewers: { id: string; name: string; email: string }[];
}

export function PipelineForm({
    initialName = '',
    initialDescription = '',
    initialStages,
    pipelineId,
    reviewers,
}: PipelineFormProps) {
    const router = useRouter();
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [stages, setStages] = useState<StageInput[]>(
        initialStages ?? [{ name: '', description: '', reviewerId: '' }]
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!pipelineId;

    const addStage = () => {
        if (stages.length >= 10) return;
        setStages([...stages, { name: '', description: '', reviewerId: '' }]);
    };

    const removeStage = (index: number) => {
        if (stages.length <= 1) return;
        setStages(stages.filter((_, i) => i !== index));
    };

    const updateStage = (index: number, field: keyof StageInput, value: string) => {
        setStages(
            stages.map((s, i) => (i === index ? { ...s, [field]: value } : s))
        );
    };

    const moveStage = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= stages.length) return;
        const updated = [...stages];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        setStages(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (name.trim().length < 3) {
            setError('Pipeline name must be at least 3 characters.');
            return;
        }

        const validStages = stages.filter((s) => s.name.trim().length > 0);
        if (validStages.length === 0) {
            setError('At least one stage with a name is required.');
            return;
        }

        setIsLoading(true);
        try {
            const url = isEditing
                ? `/api/admin/pipelines/${pipelineId}`
                : '/api/admin/pipelines';
            const method = isEditing ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    stages: validStages.map((s) => ({
                        name: s.name.trim(),
                        description: s.description.trim() || undefined,
                        reviewerId: s.reviewerId || null,
                    })),
                }),
            });

            if (res.ok) {
                router.push('/admin/pipelines');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error ?? 'Failed to save pipeline.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pipeline name */}
            <div>
                <label htmlFor="pipeline-name" className="block text-sm font-medium text-gray-700">
                    Pipeline Name <span className="text-red-500">*</span>
                </label>
                <input
                    id="pipeline-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard Review"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                    minLength={3}
                    maxLength={200}
                />
            </div>

            {/* Pipeline description */}
            <div>
                <label htmlFor="pipeline-desc" className="block text-sm font-medium text-gray-700">
                    Description
                </label>
                <textarea
                    id="pipeline-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Optional description of when this pipeline should be used…"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    maxLength={1000}
                />
            </div>

            {/* Stages */}
            <div>
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">
                        Review Stages <span className="text-red-500">*</span>
                    </h3>
                    <button
                        type="button"
                        onClick={addStage}
                        disabled={stages.length >= 10}
                        className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                    >
                        + Add Stage
                    </button>
                </div>
                <div className="mt-3 space-y-4">
                    {stages.map((stage, index) => (
                        <div
                            key={index}
                            className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-500">
                                    Stage {index + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => moveStage(index, 'up')}
                                        disabled={index === 0}
                                        className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                        title="Move up"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveStage(index, 'down')}
                                        disabled={index === stages.length - 1}
                                        className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                        title="Move down"
                                    >
                                        ↓
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeStage(index)}
                                        disabled={stages.length <= 1}
                                        className="rounded p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                                        title="Remove"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">
                                        Stage Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={stage.name}
                                        onChange={(e) => updateStage(index, 'name', e.target.value)}
                                        placeholder="e.g. Technical Review"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                        required
                                        minLength={2}
                                        maxLength={200}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">
                                        Assigned Reviewer
                                    </label>
                                    <select
                                        value={stage.reviewerId}
                                        onChange={(e) => updateStage(index, 'reviewerId', e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                                    >
                                        <option value="">Any admin/inspector</option>
                                        {reviewers.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.name} ({r.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-2">
                                <label className="block text-xs font-medium text-gray-600">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={stage.description}
                                    onChange={(e) => updateStage(index, 'description', e.target.value)}
                                    placeholder="What should be reviewed at this stage?"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                    maxLength={1000}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? 'Saving…' : isEditing ? 'Update Pipeline' : 'Create Pipeline'}
                </button>
                <button
                    type="button"
                    onClick={() => router.push('/admin/pipelines')}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
