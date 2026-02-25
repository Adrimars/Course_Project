import { z } from 'zod';

const StageDecisionValues = ['APPROVED', 'REJECTED', 'RETURNED'] as const;

// ─── Pipeline Stage Input ────────────────────────────────────────────────────

export const pipelineStageSchema = z.object({
    name: z
        .string()
        .min(2, 'Stage name must be at least 2 characters')
        .max(200, 'Stage name must not exceed 200 characters'),
    description: z
        .string()
        .max(1000, 'Stage description must not exceed 1000 characters')
        .optional()
        .default(''),
    reviewerId: z.string().optional().nullable(),
});

// ─── Create Pipeline ─────────────────────────────────────────────────────────

export const pipelineCreateSchema = z.object({
    name: z
        .string()
        .min(3, 'Pipeline name must be at least 3 characters')
        .max(200, 'Pipeline name must not exceed 200 characters'),
    description: z
        .string()
        .max(1000, 'Pipeline description must not exceed 1000 characters')
        .optional()
        .default(''),
    stages: z
        .array(pipelineStageSchema)
        .min(1, 'Pipeline must have at least one stage')
        .max(10, 'Pipeline cannot have more than 10 stages'),
});

// ─── Update Pipeline ─────────────────────────────────────────────────────────

export const pipelineUpdateSchema = z.object({
    name: z
        .string()
        .min(3, 'Pipeline name must be at least 3 characters')
        .max(200, 'Pipeline name must not exceed 200 characters')
        .optional(),
    description: z
        .string()
        .max(1000, 'Pipeline description must not exceed 1000 characters')
        .optional(),
    stages: z
        .array(pipelineStageSchema)
        .min(1, 'Pipeline must have at least one stage')
        .max(10, 'Pipeline cannot have more than 10 stages')
        .optional(),
});

// ─── Assign Pipeline to Idea ─────────────────────────────────────────────────

export const assignPipelineSchema = z.object({
    pipelineId: z.string().min(1, 'Pipeline ID is required'),
});

// ─── Stage Review ────────────────────────────────────────────────────────────

export const stageReviewSchema = z.object({
    decision: z.enum(StageDecisionValues, {
        error: 'Decision must be APPROVED, REJECTED, or RETURNED',
    }),
    feedback: z
        .string()
        .min(10, 'Feedback must be at least 10 characters')
        .max(2000, 'Feedback must not exceed 2000 characters')
        .transform((val) => val.trim()),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type PipelineStageInput = z.infer<typeof pipelineStageSchema>;
export type PipelineCreateInput = z.infer<typeof pipelineCreateSchema>;
export type PipelineUpdateInput = z.infer<typeof pipelineUpdateSchema>;
export type AssignPipelineInput = z.infer<typeof assignPipelineSchema>;
export type StageReviewInput = z.infer<typeof stageReviewSchema>;
