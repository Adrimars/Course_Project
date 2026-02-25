import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { registerSchema } from '@/lib/validations/user';
import { Role } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input with Zod
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          // Zod 4 uses .issues array
          details: parsed.error.issues.reduce<Record<string, string[]>>(
            (acc, issue) => {
              const key = issue.path.join('.') || 'root';
              if (!acc[key]) acc[key] = [];
              acc[key].push(issue.message);
              return acc;
            },
            {}
          ),
        },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // spec CHK001: First user becomes admin — handled atomically in a transaction
    // with serializable isolation to prevent race conditions
    const user = await prisma.$transaction(
      async (tx) => {
        // Check for existing user (email uniqueness)
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) {
          throw new Error('EMAIL_TAKEN');
        }

        // Count existing users to determine role (CHK001)
        const userCount = await tx.user.count();
        const role: Role = userCount === 0 ? Role.ADMIN : Role.USER;

        // Hash password — minimum 12 rounds (spec: ≥10)
        const hashedPassword = await hash(password, 12);

        return tx.user.create({
          data: {
            name,
            email,
            hashedPassword,
            role,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'EMAIL_TAKEN') {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 }
        );
      }
    }
    console.error('[POST /api/auth/register]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
