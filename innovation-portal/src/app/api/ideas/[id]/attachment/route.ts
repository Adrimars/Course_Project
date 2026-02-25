import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types';
import { uploadDir } from '@/lib/upload';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/ideas/[id]/attachment
 *
 * spec CHK009 / FR-005a:
 * - Files are served exclusively via this authenticated API route.
 * - The upload directory is NOT a static asset.
 * - Same visibility + ownership check as the idea detail endpoint.
 * - Storage path (UUID) is NEVER exposed in API responses.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = session.user.role === Role.ADMIN;

  // Fetch the idea with its attachment
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      attachment: true,
    },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  if (!idea.attachment) {
    return NextResponse.json({ error: 'No attachment found' }, { status: 404 });
  }

  // Apply same access control as idea detail (spec FR-007d / CHK009)
  if (
    idea.visibility === 'PRIVATE' &&
    !isAdmin &&
    idea.submitterId !== session.user.id
  ) {
    return NextResponse.json(
      { error: 'You do not have access to this file.' },
      { status: 403 }
    );
  }

  // Resolve the storage path from the UUID filename stored in DB
  const filePath = path.join(uploadDir, idea.attachment.storagePath);

  // Verify the file exists on disk
  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
  }

  // Stream the file with Content-Disposition: attachment header
  const stream = createReadStream(filePath);
  const originalName = encodeURIComponent(idea.attachment.originalName);

  // Convert Node.js ReadableStream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': idea.attachment.mimeType,
      'Content-Disposition': `attachment; filename="${originalName}"`,
      'Content-Length': idea.attachment.size.toString(),
      'Cache-Control': 'no-store',
    },
  });
}
