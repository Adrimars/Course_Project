'use client';

export interface VideoLinkItem {
  url: string;
  title?: string;
}

interface VideoEmbedProps {
  videos: VideoLinkItem[];
}

/**
 * Phase 3: Renders YouTube and Vimeo video embed iframes.
 * Extracts the video ID from the URL and constructs the embed URL.
 */
export function VideoEmbed({ videos }: VideoEmbedProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Video Links</h3>
      <div className="flex flex-col gap-4">
        {videos.map((video, idx) => {
          const embedUrl = getEmbedUrl(video.url);
          if (!embedUrl) return null;

          return (
            <div key={idx} className="rounded-lg overflow-hidden border border-gray-200">
              {video.title && (
                <p className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border-b border-gray-200 truncate">
                  {video.title}
                </p>
              )}
              <div className="relative aspect-video">
                <iframe
                  src={embedUrl}
                  title={video.title ?? `Video ${idx + 1}`}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Converts a YouTube/Vimeo watch URL to its embed URL. Returns null for unrecognised URLs. */
function getEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // YouTube
    if (
      parsed.hostname === 'www.youtube.com' ||
      parsed.hostname === 'youtube.com'
    ) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (parsed.hostname === 'www.youtube.com' && parsed.pathname.startsWith('/embed/')) {
      return url; // already an embed URL
    }
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // Vimeo
    if (
      parsed.hostname === 'www.vimeo.com' ||
      parsed.hostname === 'vimeo.com'
    ) {
      const id = parsed.pathname.replace(/^\//, '');
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }

    return null;
  } catch {
    return null;
  }
}
