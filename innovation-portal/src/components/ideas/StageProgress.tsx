'use client';

import { ReviewStageInfo, StageReviewInfo, StageDecision } from '@/types';

interface StageProgressProps {
    stages: ReviewStageInfo[];
    currentStageOrder: number;
    stageReviews: StageReviewInfo[];
}

const DECISION_ICON: Record<string, string> = {
    [StageDecision.APPROVED]: '✓',
    [StageDecision.REJECTED]: '✗',
    [StageDecision.RETURNED]: '↩',
};

/**
 * Visual horizontal stepper showing all stages in the pipeline.
 * - Completed (APPROVED) stages: green
 * - Current stage: blue/pulsing
 * - Upcoming stages: gray
 * - Rejected stages: red
 */
export function StageProgress({
    stages,
    currentStageOrder,
    stageReviews,
}: StageProgressProps) {
    // Build a map of latest review decision per stage
    const latestReviewPerStage: Record<string, StageReviewInfo> = {};
    for (const review of stageReviews) {
        // Last one wins (reviews are ordered by createdAt asc)
        latestReviewPerStage[review.stageId] = review;
    }

    return (
        <div className="w-full">
            {/* Desktop: horizontal */}
            <div className="hidden sm:flex sm:items-start sm:gap-0">
                {stages.map((stage, index) => {
                    const review = latestReviewPerStage[stage.id];
                    const isCompleted = review?.decision === StageDecision.APPROVED && stage.stageOrder < currentStageOrder;
                    const isCurrent = stage.stageOrder === currentStageOrder;
                    const isRejected = review?.decision === StageDecision.REJECTED;
                    const isReturned = review?.decision === StageDecision.RETURNED;
                    const isLast = index === stages.length - 1;

                    let circleClass = 'bg-gray-200 text-gray-500'; // default: upcoming
                    let label = `${index + 1}`;
                    if (isCompleted) {
                        circleClass = 'bg-green-500 text-white';
                        label = DECISION_ICON[StageDecision.APPROVED];
                    } else if (isRejected) {
                        circleClass = 'bg-red-500 text-white';
                        label = DECISION_ICON[StageDecision.REJECTED];
                    } else if (isReturned) {
                        circleClass = 'bg-amber-400 text-white';
                        label = DECISION_ICON[StageDecision.RETURNED];
                    } else if (isCurrent) {
                        circleClass = 'bg-blue-500 text-white ring-4 ring-blue-200';
                    }

                    return (
                        <div key={stage.id} className="flex flex-1 items-start">
                            <div className="flex flex-col items-center">
                                {/* Circle */}
                                <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${circleClass} transition-all`}
                                >
                                    {label}
                                </div>
                                {/* Stage name */}
                                <p
                                    className={`mt-2 max-w-[100px] text-center text-xs font-medium ${isCurrent ? 'text-blue-700' : 'text-gray-600'
                                        }`}
                                >
                                    {stage.name}
                                </p>
                                {/* Reviewer */}
                                {stage.reviewer && (
                                    <p className="mt-0.5 max-w-[100px] text-center text-[10px] text-gray-400">
                                        {stage.reviewer.name}
                                    </p>
                                )}
                            </div>
                            {/* Connector line */}
                            {!isLast && (
                                <div className="mt-4 flex-1 px-1">
                                    <div
                                        className={`h-0.5 w-full ${isCompleted ? 'bg-green-400' : 'bg-gray-200'
                                            }`}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile: vertical */}
            <div className="flex flex-col gap-3 sm:hidden">
                {stages.map((stage, index) => {
                    const review = latestReviewPerStage[stage.id];
                    const isCompleted = review?.decision === StageDecision.APPROVED && stage.stageOrder < currentStageOrder;
                    const isCurrent = stage.stageOrder === currentStageOrder;
                    const isRejected = review?.decision === StageDecision.REJECTED;

                    let dotClass = 'bg-gray-300';
                    if (isCompleted) dotClass = 'bg-green-500';
                    else if (isRejected) dotClass = 'bg-red-500';
                    else if (isCurrent) dotClass = 'bg-blue-500 ring-2 ring-blue-200';

                    return (
                        <div key={stage.id} className="flex items-center gap-3">
                            <div className={`h-4 w-4 flex-shrink-0 rounded-full ${dotClass}`} />
                            <div>
                                <p className={`text-sm font-medium ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {index + 1}. {stage.name}
                                </p>
                                {stage.reviewer && (
                                    <p className="text-xs text-gray-400">Reviewer: {stage.reviewer.name}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
