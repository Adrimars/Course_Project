import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ideaSubmitSchema } from '@/lib/validations/idea';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils';
import { Role } from '@/types';
import { uploadDir, ALLOWED_MIME_TYPES } from '@/lib/upload';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── GET /api/ideas — Paginated idea list ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const { skip, take } = getPaginationParams(page);

  const isAdmin = session.user.role === Role.ADMIN;

  // spec FR-007a: Visibility filter — admin sees all; user sees PUBLIC + own PRIVATE
  const whereClause = isAdmin
    ? {}
    : {
        OR: [
          { visibility: 'PUBLIC' as const },
          { submitterId: session.user.id },
        ],
      };

  const [ideas, totalCount] = await Promise.all([
    prisma.idea.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        visibility: true,
        createdAt: true,
        submitter: {
          select: { id: true, name: true },
        },
        attachment: {
          select: { id: true },
        },
      },
    }),
    prisma.idea.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    data: ideas,
    pagination: buildPaginationMeta(page, totalCount),
  });
}

// ─── POST /api/ideas — Create idea ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  // Extract text fields
  const textFields = {
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    visibility: formData.get('visibility') ?? 'PUBLIC',
  };

  // Validate with Zod
  const parsed = ideaSubmitSchema.safeParse(textFields);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
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
      { status: 422 }
    );
  }

  const { title, description, category, visibility } = parsed.data;

  // Handle optional file attachment
  const file = formData.get('attachment');
  let savedFile: {
    storagePath: string;
    originalName: string;
    mimeType: string;
    size: number;
  } | null = null;

  if (file instanceof File && file.size > 0) {
    // spec CHK021: 10 MB limit — client-side and server-side
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit.' },
        { status: 413 }
      );
    }

    // spec CHK017: Server-side MIME type validation
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            'File type not allowed. Allowed: PDF, DOC, DOCX, PNG, JPEG',
        },
        { status: 422 }
      );
    }

    // spec CHK018: UUID v4 filename, original name stored in DB only
    const storageFilename = uuidv4();
    const storagePath = path.join(uploadDir, storageFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storagePath, buffer);

    savedFile = {
      storagePath: storageFilename, // Store only the UUID filename, not the full path
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    };
  }

  // Create idea + optional attachment in a Prisma transaction (spec CHK048)
  const idea = await prisma.$transaction(async (tx) => {
    const created = await tx.idea.create({
      data: {
        title,
        description,
        category,
        visibility,
        submitterId: session.user.id,
        ...(savedFile && {
          attachment: {
            create: savedFile,
          },
        }),
      },
      include: {
        attachment: {
          select: { id: true, originalName: true, mimeType: true, size: true },
        },
        submitter: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return created;
  });

  return NextResponse.json(idea, { status: 201 });
}
