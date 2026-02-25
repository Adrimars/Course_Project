import { ideaSubmitSchema, evaluateSchema } from '@/lib/validations/idea';

describe('ideaSubmitSchema', () => {
  const validPayload = {
    title: 'A Valid Idea Title Here',
    description:
      'This is a detailed description that meets the minimum character requirement of fifty characters.',
    category: 'TECHNOLOGY',
    visibility: 'PUBLIC',
  };

  it('passes with valid inputs', () => {
    expect(ideaSubmitSchema.safeParse(validPayload).success).toBe(true);
  });

  it('fails when title is shorter than 10 characters', () => {
    const result = ideaSubmitSchema.safeParse({ ...validPayload, title: 'Short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('10'))
      ).toBe(true);
    }
  });

  it('fails when title exceeds 200 characters', () => {
    const result = ideaSubmitSchema.safeParse({
      ...validPayload,
      title: 'A'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('fails when description is shorter than 50 characters', () => {
    const result = ideaSubmitSchema.safeParse({
      ...validPayload,
      description: 'Too short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('50'))
      ).toBe(true);
    }
  });

  it('fails when description exceeds 5000 characters', () => {
    const result = ideaSubmitSchema.safeParse({
      ...validPayload,
      description: 'A'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('fails when category is missing', () => {
    const { category: _, ...withoutCategory } = validPayload;
    const result = ideaSubmitSchema.safeParse(withoutCategory);
    expect(result.success).toBe(false);
  });

  it('accepts all valid category enum values', () => {
    const categories = [
      'TECHNOLOGY',
      'PROCESS',
      'PRODUCT',
      'COST_SAVING',
      'CUSTOMER_EXPERIENCE',
      'OTHER',
    ];
    for (const category of categories) {
      expect(
        ideaSubmitSchema.safeParse({ ...validPayload, category }).success
      ).toBe(true);
    }
  });

  it('fails for invalid category value', () => {
    const result = ideaSubmitSchema.safeParse({
      ...validPayload,
      category: 'INVALID_CATEGORY',
    });
    expect(result.success).toBe(false);
  });

  it('defaults visibility to PUBLIC when omitted', () => {
    const { visibility: _, ...withoutVisibility } = validPayload;
    const result = ideaSubmitSchema.safeParse(withoutVisibility);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe('PUBLIC');
    }
  });

  it('fails for invalid visibility value', () => {
    const result = ideaSubmitSchema.safeParse({
      ...validPayload,
      visibility: 'UNKNOWN',
    });
    expect(result.success).toBe(false);
  });
});

// ─── evaluateSchema (T065) ────────────────────────────────────────────────────

describe('evaluateSchema', () => {
  const validEvaluation = {
    status: 'ACCEPTED',
    feedback: 'This is wonderful feedback that meets the minimum requirement.',
  };

  it('passes with ACCEPTED status and valid feedback', () => {
    expect(evaluateSchema.safeParse(validEvaluation).success).toBe(true);
  });

  it('passes with REJECTED status', () => {
    expect(
      evaluateSchema.safeParse({ ...validEvaluation, status: 'REJECTED' }).success
    ).toBe(true);
  });

  it('passes with UNDER_REVIEW status', () => {
    expect(
      evaluateSchema.safeParse({ ...validEvaluation, status: 'UNDER_REVIEW' }).success
    ).toBe(true);
  });

  it('fails when feedback is missing', () => {
    const result = evaluateSchema.safeParse({ status: 'ACCEPTED' });
    expect(result.success).toBe(false);
  });

  it('fails when feedback is shorter than 10 characters', () => {
    const result = evaluateSchema.safeParse({ ...validEvaluation, feedback: 'Short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('10'))).toBe(true);
    }
  });

  it('fails when feedback exceeds 2000 characters', () => {
    const result = evaluateSchema.safeParse({
      ...validEvaluation,
      feedback: 'A'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('fails for non-enum status value', () => {
    const result = evaluateSchema.safeParse({
      ...validEvaluation,
      status: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from feedback', () => {
    const result = evaluateSchema.safeParse({
      ...validEvaluation,
      feedback: '  Great feedback here  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.feedback).toBe('Great feedback here');
    }
  });
});
