import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

/**
 * Converts Zod issues into a { field: string[] } record suitable for API responses.
 */
export function formatZodErrors(error: ZodError): Record<string, string[]> {
    return error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const key = issue.path.join('.') || 'root';
        if (!acc[key]) acc[key] = [];
        acc[key].push(issue.message);
        return acc;
    }, {});
}

/**
 * Returns a standardised 422 validation-error response.
 */
export function zodErrorResponse(error: ZodError, status = 422) {
    return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(error) },
        { status }
    );
}
