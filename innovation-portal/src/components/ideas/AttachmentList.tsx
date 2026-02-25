import { formatFileSize } from '@/lib/utils';

export interface AttachmentListItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  displayOrder: number;
}

interface AttachmentListProps {
  attachments: AttachmentListItem[];
  /** API base URL, e.g. /api/ideas/[id]/attachments */
  baseUrl: string;
}

const MIME_ICONS: Record<string, string> = {
  'application/pdf':   '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-powerpoint': '📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'video/mp4': '🎬',
  'image/png':  '🖼️',
  'image/jpeg': '🖼️',
};

function getIcon(mimeType: string) {
  return MIME_ICONS[mimeType] ?? '📎';
}

/**
 * Phase 3: Renders all non-gallery attachments as a downloadable file list.
 * Images are handled by MediaGallery; this component renders documents,
 * spreadsheets, presentations, and video files.
 */
export function AttachmentList({ attachments, baseUrl }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        File Attachments ({attachments.length})
      </h3>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 overflow-hidden">
        {attachments.map((att) => (
          <li key={att.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
            <span className="text-2xl" aria-hidden="true">{getIcon(att.mimeType)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{att.originalName}</p>
              <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
            </div>
            <a
              href={`${baseUrl}/${att.id}`}
              download={att.originalName}
              className="shrink-0 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
