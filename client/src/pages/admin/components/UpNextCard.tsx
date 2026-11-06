import { Flag, Music, Presentation, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { NextPreview } from '../../../types';

/** Host-only preview of what comes after the current question or slide. */
export function UpNextCard({ preview }: { preview: NextPreview }) {
  if (!preview.hasNext) {
    return (
      <Card className="mb-4 w-full max-w-4xl border-warn/30 bg-warn/[0.06]">
        <CardContent className="p-4">
          <span className="mono-label inline-flex items-center gap-1.5 text-warn">
            Final scores next <Flag className="size-4" />
          </span>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="mb-4 w-full max-w-4xl zync-gs">
      <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
        <span className="mono-label inline-flex items-center gap-1.5 text-brand">
          {preview.isSlide ? (
            <>
              Up next · Slide <Presentation className="size-4" />
            </>
          ) : (
            <>
              Up next · Q{preview.index + 1} of {preview.total}
            </>
          )}
        </span>
        {preview.mediaType && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
            {preview.mediaType === 'audio' ? (
              <>
                <Music className="size-4" /> Audio
              </>
            ) : (
              <>
                <Video className="size-4" /> Video
              </>
            )}
          </span>
        )}
        <span className="w-full text-[1.05rem] font-semibold">{preview.text}</span>
      </CardContent>
    </Card>
  );
}
