import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types';
import { uploadDir } from '@/lib/upload';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/ideas/[id]/attachment
 *
 * Phase 3 backward-compat shim: returns the first (lowest displayOrder)
 * attachment for this idea. For named download of any attachment, use
 * GET /api/ideas/[id]/attachments/[attachmentId] instead.
 *
 * spec CHK009 / FR-005a: Files served exclusively through authenticated
 * API routes. Upload directory is NOT a static asset. Storage UUIDs are
 * never exposed in API responses.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  // Fetch the idea with its first attachment (ordered by displayOrder)
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      attachments: {
        orderBy: { displayOrder: 'asc' },
        take: 1,
      },
    },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  const attachment = idea.attachments[0];
  if (!attachment) {
    return NextResponse.json({ error: 'No attachment found' }, { status: 404 });
  }

  // Apply same access control as idea detail (spec FR-007d / CHK009)
  if (
    (idea.visibility === 'PRIVATE' && !isPrivileged && idea.submitterId !== session.user.id) ||
    (idea.status === 'INSPECTING' && !isPrivileged)
  ) {
    return NextResponse.json(
      { error: 'You do not have access to this file.' },
      { status: 403 }
    );
  }

  // Resolve the storage path from the UUID filename stored in DB
  const filePath = path.join(uploadDir, attachment.storagePath);
  const resolved = path.resolve(filePath);
  const resolvedUploadDir = path.resolve(uploadDir);

  // Guard against path traversal
  if (!resolved.startsWith(resolvedUploadDir + path.sep) && resolved !== resolvedUploadDir) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  // Verify the file exists on disk
  try {
    await stat(resolved);
  } catch {
    return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
  }

  // Stream the file with Content-Disposition: attachment header
  const stream = createReadStream(resolved);
  const originalName = encodeURIComponent(attachment.originalName);

  // Use Node.js built-in Readable.toWeb() for proper backpressure handling
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${originalName}"`,
      'Content-Length': attachment.size.toString(),
      'Cache-Control': 'no-store',
    },
  });
}
