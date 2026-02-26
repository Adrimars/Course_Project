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

type RouteParams = { params: Promise<{ id: string; attachmentId: string }> };

/**
 * GET /api/ideas/[id]/attachments/[attachmentId]
 *
 * Phase 3: per-attachment download.
 * - Verifies the attachment belongs to the given idea.
 * - Same visibility + ownership access control as the idea detail endpoint.
 * - Storage UUIDs are NEVER exposed in API responses.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, attachmentId } = await params;
  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  // Fetch idea + specific attachment in one query
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      attachments: { where: { id: attachmentId } },
    },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  const attachment = idea.attachments[0];
  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  // Access control: private ideas + INSPECTING ideas
  const isOwner = idea.submitterId === session.user.id;
  if (
    (idea.visibility === 'PRIVATE' && !isOwner && !isPrivileged) ||
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

  try {
    await stat(resolved);
  } catch {
    return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
  }

  // Stream file with Content-Disposition header
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
