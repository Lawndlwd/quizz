import { ImagePlus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { MediaPicker, type MediaTab } from '@/components/MediaPicker';
import { QuestionImage } from '@/components/QuestionImage';
import { QuestionMedia } from '@/components/QuestionMedia';
import { Button } from '@/components/ui/button';
import { hasQuestionImage, parseYouTubeId } from '@/helpers';
import type { ImportQuestion } from '@/types';
import type { questionOps } from './questionOps';

interface Props {
  q: ImportQuestion;
  ops: ReturnType<typeof questionOps>;
  /** Restrict which media tabs are offered (e.g. geo: no audio). */
  allow?: MediaTab[];
  /** Prompt shown in the empty state. */
  label?: string;
}

/**
 * The 16:9 media area on the studio canvas — shows the question's current image
 * / GIF / YouTube media, or an empty state that opens the search picker.
 */
export function MediaZone({ q, ops, allow, label }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const hasImage = hasQuestionImage(q.imageUrl);
  const hasYouTube = q.mediaType && parseYouTubeId(q.mediaUrl);
  // A mediaUrl that doesn't parse (e.g. a non-YouTube link from a JSON import)
  // must stay visible and removable — hiding it behind the empty state would
  // silently ship broken media to players.
  const hasBrokenMedia = !!q.mediaType && !!q.mediaUrl && !hasYouTube;
  const hasMedia = hasImage || hasYouTube;

  return (
    <div className="mb-5">
      {hasBrokenMedia ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-destructive/60 bg-destructive/5 p-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <TriangleAlert className="size-4" /> Unsupported media link
          </span>
          <code className="max-w-full truncate text-xs text-muted-foreground">{q.mediaUrl}</code>
          <span className="text-xs text-muted-foreground">
            Only YouTube links play in the game — replace it or remove it.
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
              Replace
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => ops.clearMedia()}>
              Remove
            </Button>
          </div>
        </div>
      ) : hasMedia ? (
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-muted/30">
          {hasImage && (
            <QuestionImage
              src={q.imageUrl}
              alt="Question media"
              className="mx-auto max-h-[320px] w-full object-contain"
            />
          )}
          {hasYouTube && (
            <div className="p-3">
              <QuestionMedia url={q.mediaUrl} kind={q.mediaType} autoPlay={false} />
            </div>
          )}
          <div className="absolute right-3 top-3 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <Button type="button" size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
              Replace
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => ops.clearMedia()}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-gradient-to-br from-muted/40 to-muted/10 transition-colors hover:border-primary hover:bg-primary/5"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ImagePlus className="size-6" />
          </span>
          <span className="text-sm font-semibold text-foreground">
            {label ?? 'Add an image, GIF, video or audio'}
          </span>
          <span className="text-xs text-muted-foreground">
            Search providers or paste a link — no upload needed
          </span>
        </button>
      )}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        allow={allow}
        onPick={(m) => {
          if (m.kind === 'image') ops.setImage(m.url);
          else ops.setYouTube(m.kind, m.url);
        }}
      />
    </div>
  );
}
