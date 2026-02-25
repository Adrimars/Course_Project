import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ideaSubmitSchema, draftSaveSchema } from '@/lib/validations/idea';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils';
import { Role } from '@/types';
import { IdeaStatus as PrismaStatus } from '@prisma/client';
import {
  uploadDir,
  ALLOWED_MIME_TYPES,
  MAX_FILES_PER_IDEA,
  MAX_AGGREGATE_SIZE,
  MAX_SINGLE_FILE_SIZE,
} from '@/lib/upload';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import path from 'path';

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
  // - Admin/Inspector see all ideas EXCEPT DRAFT (drafts are private to owner)
  // - Regular users see PUBLIC + own PRIVATE, but never INSPECTING or DRAFT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessFilter: any = isPrivileged
    ? { status: { not: PrismaStatus.DRAFT } }
    : {
      AND: [
        { status: { notIn: [PrismaStatus.INSPECTING, PrismaStatus.DRAFT] } },
        {
          OR: [
            { visibility: 'PUBLIC' },
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
        attachments: {
          select: { id: true },
          orderBy: { displayOrder: 'asc' },
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

  // ─── Parse text fields ───────────────────────────────────────────────────────────────
  const rawMetadata = formData.get('metadata');
  let parsedMetadata: Record<string, string> | undefined;
  if (rawMetadata && typeof rawMetadata === 'string') {
    try { parsedMetadata = JSON.parse(rawMetadata); } catch { /* ignore */ }
  }

  const rawVideoLinks = formData.get('videoLinks');
  let parsedVideoLinks: Array<{ url: string; title?: string }> | undefined;
  if (rawVideoLinks && typeof rawVideoLinks === 'string') {
    try { parsedVideoLinks = JSON.parse(rawVideoLinks); } catch { /* ignore */ }
  }

  // Phase 4: check if saving as draft
  const isDraft = formData.get('isDraft') === 'true';

  const textFields = {
    title:       formData.get('title'),
    description: formData.get('description'),
    category:    formData.get('category'),
    visibility:  formData.get('visibility') ?? 'PUBLIC',
    metadata:    parsedMetadata,
    videoLinks:  parsedVideoLinks,
  };

  // Use relaxed schema for drafts, full schema for submissions
  const schema = isDraft ? draftSaveSchema : ideaSubmitSchema;
  const parsed = schema.safeParse(textFields);
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

  const { title, description, category, visibility, metadata, videoLinks } = parsed.data as {
    title: string;
    description: string;
    category?: string;
    visibility: string;
    metadata?: Record<string, string>;
    videoLinks?: Array<{ url: string; title?: string }>;
  };

  // ─── Phase 3: Multiple file attachments ─────────────────────────────────────────────
  // Collect all files from the multipart form (field names: attachment, attachment[])
  const rawFiles = formData.getAll('attachments');
  const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

  // Enforce per-idea file count limit
  if (files.length > MAX_FILES_PER_IDEA) {
    return NextResponse.json(
      { error: `You may attach at most ${MAX_FILES_PER_IDEA} files per idea.` },
      { status: 422 }
    );
  }

  // Enforce aggregate size cap (50 MB)
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_AGGREGATE_SIZE) {
    return NextResponse.json(
      { error: 'Total attachment size exceeds the 50 MB per-idea limit.' },
      { status: 413 }
    );
  }

  // Validate and buffer each file
  type SavedFile = {
    storagePath: string;
    originalName: string;
    mimeType: string;
    size: number;
    displayOrder: number;
  };

  const { fileTypeFromBuffer } = await import('file-type');
  const savedFiles: SavedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (file.size > MAX_SINGLE_FILE_SIZE) {
      return NextResponse.json(
        { error: `File "${file.name}" exceeds the 10 MB per-file limit.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // BUG-2 FIX: Validate MIME type from magic bytes, not the client-supplied header.
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      return NextResponse.json(
        {
          error: `File "${file.name}" has an unsupported type. Allowed: PDF, DOC, DOCX, PNG, JPEG, PPTX, XLSX, MP4`,
        },
        { status: 422 }
      );
    }

    // spec CHK018: UUID v4 filename, original name stored in DB only
    const storageFilename = uuidv4();
    await writeFile(path.join(uploadDir, storageFilename), buffer);

    savedFiles.push({
      storagePath:  storageFilename,
      originalName: file.name,
      mimeType:     detected.mime,
      size:         file.size,
      displayOrder: i,
    });
  }

  // ─── Create idea + attachments in a Prisma transaction (spec CHK048) ─────────────
  const idea = await prisma.$transaction(async (tx) => {
    const created = await tx.idea.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        title:       title ?? '',
        description: description ?? '',
        category:    category ?? 'OTHER',
        status:      isDraft ? 'DRAFT' : 'SUBMITTED',
        visibility,
        metadata:   metadata   ?? undefined,
        videoLinks: videoLinks && videoLinks.length > 0 ? videoLinks : undefined,
        submitterId: session.user.id,
        ...(savedFiles.length > 0 && {
          attachments: {
            create: savedFiles,
          },
        }),
      } as any,
      include: {
        attachments: {
          select: { id: true, originalName: true, mimeType: true, size: true, displayOrder: true },
          orderBy: { displayOrder: 'asc' },
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
