import { z } from 'zod';

const IdeaCategoryValues = [
  'TECHNOLOGY',
  'PROCESS',
  'PRODUCT',
  'COST_SAVING',
  'CUSTOMER_EXPERIENCE',
  'OTHER',
] as const;

const IdeaStatusValues = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'INSPECTING',
] as const;

const VisibilityValues = ['PUBLIC', 'PRIVATE'] as const;

/**
 * Schema for idea submission (POST /api/ideas)
 * Title: min 10, max 200 chars
 * Description: min 50, max 5000 chars
 * Category: required enum value
 * Visibility: defaults to PUBLIC
 */
export const ideaSubmitSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  category: z.enum(IdeaCategoryValues, {
    error: 'Please select a valid category',
  }),
  visibility: z.enum(VisibilityValues).optional().default('PUBLIC'),
});

/**
 * Schema for idea evaluation (PATCH /api/ideas/[id]) — admin only
 * Status: required enum value
 * Feedback: required, 10–2000 chars (trimmed)
 */
export const evaluateSchema = z.object({
  status: z.enum(IdeaStatusValues, {
    error: 'Please select a valid status',
  }),
  feedback: z
    .string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback must not exceed 2000 characters')
    .transform((val) => val.trim()),
});

/**
 * Schema for visibility update (PATCH /api/ideas/[id]) — submitter only
 */
export const visibilityUpdateSchema = z.object({
  visibility: z.enum(VisibilityValues),
});

export type IdeaSubmitInput = z.infer<typeof ideaSubmitSchema>;
export type EvaluateInput = z.infer<typeof evaluateSchema>;
export type VisibilityUpdateInput = z.infer<typeof visibilityUpdateSchema>;
