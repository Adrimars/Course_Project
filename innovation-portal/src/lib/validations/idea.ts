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
 * Phase 2: Category-specific metadata schemas
 * Each category has optional structured fields for richer submissions.
 */
export const categoryMetadataSchema = z.record(z.string(), z.string()).optional();

// Per-category field definitions (used for rendering in the form)
export const CATEGORY_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; type: 'text' | 'textarea' | 'select'; options?: string[] }>> = {
  TECHNOLOGY: [
    { key: 'techStack', label: 'Technologies / Tools Involved', placeholder: 'e.g. React, Python, AWS Lambda', type: 'text' },
    { key: 'estimatedEffort', label: 'Estimated Implementation Effort', placeholder: '', type: 'select', options: ['< 1 week', '1–4 weeks', '1–3 months', '3+ months'] },
  ],
  PROCESS: [
    { key: 'currentPainPoint', label: 'Current Process Pain Point', placeholder: 'Describe what is slow, broken, or manual today…', type: 'textarea' },
    { key: 'expectedGain', label: 'Expected Efficiency Gain', placeholder: '', type: 'select', options: ['< 10%', '10–25%', '25–50%', '> 50%'] },
  ],
  PRODUCT: [
    { key: 'targetUsers', label: 'Target Users / Market', placeholder: 'e.g. internal ops team, SMB customers', type: 'text' },
    { key: 'keyDifferentiator', label: 'Key Differentiator', placeholder: 'What makes this better than existing solutions?', type: 'text' },
  ],
  COST_SAVING: [
    { key: 'currentCost', label: 'Current Cost / Waste', placeholder: 'e.g. $5,000/month on manual processing', type: 'text' },
    { key: 'estimatedSavings', label: 'Estimated Annual Savings', placeholder: 'e.g. $30,000/year', type: 'text' },
  ],
  CUSTOMER_EXPERIENCE: [
    { key: 'customerSegment', label: 'Customer Segment', placeholder: 'e.g. enterprise accounts, mobile users', type: 'text' },
    { key: 'painPoint', label: 'Customer Pain Point', placeholder: 'What specific problem does the customer face?', type: 'text' },
  ],
  OTHER: [
    { key: 'additionalContext', label: 'Additional Context', placeholder: 'Any background information that supports this idea…', type: 'textarea' },
  ],
};

// Per-category form templates for quick-start
export const CATEGORY_TEMPLATES: Record<string, { title: string; description: string }> = {
  TECHNOLOGY: {
    title: 'Automate [process] using [technology]',
    description: 'Currently, [process] requires significant manual effort. By introducing [technology], we can automate [specific steps], reducing time from [X hours] to [Y minutes]. This will free up the team to focus on higher-value tasks and reduce error rates.',
  },
  PROCESS: {
    title: 'Streamline [process name] to eliminate [pain point]',
    description: 'Our current [process] involves [number] manual steps and takes [X time]. The main bottleneck is [bottleneck]. By redesigning the workflow to [proposed change], we expect to reduce cycle time by [X%] and eliminate [specific waste].',
  },
  PRODUCT: {
    title: 'Add [feature] to [product] for [target users]',
    description: 'Our [target users] frequently request [feature]. Currently they work around this by [workaround], which is inefficient. Adding [feature] would allow them to [benefit]. Initial analysis suggests this would affect [X] users and improve retention by [Y%].',
  },
  COST_SAVING: {
    title: 'Reduce [cost area] spend by [approach]',
    description: 'We currently spend approximately [amount] on [cost area] each year. Analysis shows that [X%] of this could be eliminated by [proposed approach]. Implementation would require [initial investment] and would break even within [timeframe].',
  },
  CUSTOMER_EXPERIENCE: {
    title: 'Improve [touchpoint] experience for [customer segment]',
    description: 'Customer feedback for [customer segment] consistently highlights [pain point] as a major friction point. [X] support tickets per month relate to this issue. By [proposed solution], we can reduce friction, improve NPS by an estimated [Y points], and decrease support volume.',
  },
  OTHER: {
    title: 'Innovation idea: [brief summary]',
    description: 'Background: [context and problem statement]. Proposed approach: [solution overview]. Expected impact: [benefits and outcomes]. Next steps to validate: [suggested experiments or research].',
  },
};

/**
 * Schema for idea submission (POST /api/ideas)
 * Title: min 10, max 200 chars
 * Description: min 50, max 5000 chars
 * Category: required enum value
 * Visibility: defaults to PUBLIC
 * Metadata: optional category-specific key/value fields (Phase 2)
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
  metadata: categoryMetadataSchema,
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
