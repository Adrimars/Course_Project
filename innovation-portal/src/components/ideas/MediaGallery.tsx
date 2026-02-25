'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface GalleryAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  displayOrder: number;
}

interface MediaGalleryProps {
  /** Image-type attachments (image/png, image/jpeg) */
  images: GalleryAttachment[];
  /** API base URL for fetching the image, e.g. /api/ideas/[id]/attachments */
  baseUrl: string;
}

/**
 * Phase 3: Displays attached images in a responsive thumbnail grid
 * with a full-screen lightbox overlay.
 */
export function MediaGallery({ images, baseUrl }: MediaGalleryProps) {
  const [selected, setSelected] = useState<GalleryAttachment | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      {/* Thumbnail grid */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Image Attachments</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setSelected(img)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Preview ${img.originalName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${baseUrl}/${img.id}`}
                alt={img.originalName}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                <span className="text-white text-xs truncate">{img.originalName}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox overlay */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview: ${selected.originalName}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/${selected.id}`}
              alt={selected.originalName}
              className="mx-auto max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <div className="mt-3 flex items-center justify-between text-white text-sm">
              <span className="truncate">{selected.originalName}</span>
              <a
                href={`${baseUrl}/${selected.id}`}
                download={selected.originalName}
                onClick={(e) => e.stopPropagation()}
                className="ml-4 shrink-0 rounded bg-white/20 px-3 py-1 hover:bg-white/30 transition-colors"
              >
                Download
              </a>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-800 shadow-lg hover:bg-gray-100"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
