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

  // Search & filter params (1.8)
  const search = searchParams.get('search')?.trim() ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const categoryFilter = searchParams.get('category') ?? '';
  const visibilityFilter = searchParams.get('visibility') ?? '';

  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  // Visibility rules:
  // - Admin/Inspector see ALL ideas
  // - Regular users see PUBLIC + own PRIVATE, but NEVER INSPECTING
  const accessFilter = isPrivileged
    ? {}
    : {
      AND: [
        { status: { not: 'INSPECTING' as const } },
        {
          OR: [
            { visibility: 'PUBLIC' as const },
            { submitterId: session.user.id },
          ],
        },
      ],
    };

  // Build search & filter conditions
  const searchConditions: Record<string, unknown>[] = [];

  if (search) {
    searchConditions.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (statusFilter) {
    searchConditions.push({ status: statusFilter });
  }
  if (categoryFilter) {
    searchConditions.push({ category: categoryFilter });
  }
  if (visibilityFilter) {
    searchConditions.push({ visibility: visibilityFilter });
  }

  const whereClause =
    searchConditions.length > 0
      ? { AND: [accessFilter, ...searchConditions] }
      : accessFilter;

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
  const rawMetadata = formData.get('metadata');
  let parsedMetadata: Record<string, string> | undefined;
  if (rawMetadata && typeof rawMetadata === 'string') {
    try {
      parsedMetadata = JSON.parse(rawMetadata);
    } catch {
      // ignore malformed metadata
    }
  }

  const textFields = {
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    visibility: formData.get('visibility') ?? 'PUBLIC',
    metadata: parsedMetadata,
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

  const { title, description, category, visibility, metadata } = parsed.data;

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

    // Read file into buffer first so we can inspect magic bytes
    const buffer = Buffer.from(await file.arrayBuffer());

    // BUG-2 FIX: Validate MIME type from magic bytes, not the client-supplied
    // Content-Type header which can be trivially spoofed.
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(buffer);

    // For PDF/DOC files, file-type may detect them; for some .doc files
    // it may return 'application/x-cfb'. We also allow the detected MIME
    // to match our allowed set.
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
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

    await writeFile(storagePath, buffer);

    savedFile = {
      storagePath: storageFilename, // Store only the UUID filename, not the full path
      originalName: file.name,
      mimeType: detected.mime, // Use the detected MIME, not the client-supplied one
      size: file.size,
    };
  }

  // Create idea + optional attachment in a Prisma transaction (spec CHK048)
  const idea = await prisma.$transaction(async (tx) => {
    const created = await tx.idea.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        title,
        description,
        category,
        visibility,
        metadata: metadata ?? undefined,
        submitterId: session.user.id,
        ...(savedFile && {
          attachment: {
            create: savedFile,
          },
        }),
      } as any,
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
