import { Check, GripVertical, ImageIcon, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MapPicker } from '@/components/GeoMap';
import { Input } from '@/components/Input';
import { MediaPicker } from '@/components/MediaPicker';
import { Button } from '@/components/ui/button';
import { countBlanks, isImageUrl, optionLetter, quadColor, quadIcon } from '@/helpers';
import { usePointerReorder } from '@/hooks/usePointerReorder';
import { cn } from '@/lib/utils';
import type { ImportQuestion } from '@/types';
import { MediaZone } from './MediaZone';
import { QuestionTextEditor } from './QuestionTextEditor';
import type { questionOps } from './questionOps';

interface Props {
  q: ImportQuestion;
  ops: ReturnType<typeof questionOps>;
  onChange: (field: keyof ImportQuestion, value: unknown) => void;
}

export function QuestionCanvas({ q, ops, onChange }: Props) {
  const { type } = ops;

  // closest_to range defaults are owned by normalizeQuestion/setType in
  // questionOps — no mount-scoped repair needed here.

  // Keep fill_blank answer rows in sync with the number of ___ markers.
  const blankCount = countBlanks(q.text);
  useEffect(() => {
    if (type !== 'fill_blank') return;
    const cur = q.blanks ?? [];
    if (cur.length !== blankCount) {
      onChange(
        'blanks',
        Array.from({ length: blankCount }, (_, i) => cur[i] ?? []),
      );
    }
  }, [type, blankCount, q.blanks, onChange]);

  const choiceMode = type === 'multiple_choice' || type === 'multi_select';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Question text — block editor (text lines + real code boxes). */}
      <QuestionTextEditor value={q.text} onChange={(v) => onChange('text', v)} />

      <MediaZone
        q={q}
        ops={ops}
        allow={type === 'geo' ? ['image', 'gif', 'video'] : undefined}
        label={type === 'geo' ? 'Add a photo — players guess where it was taken' : undefined}
      />

      {choiceMode && (
        <ChoiceTiles q={q} ops={ops} onChange={onChange} multi={type === 'multi_select'} />
      )}

      {type === 'true_false' && (
        <div className="grid grid-cols-2 gap-4">
          {['True', 'False'].map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => onChange('correctIndex', i)}
              className={cn(
                'flex h-24 items-center justify-center gap-2 rounded-2xl text-xl font-extrabold text-white transition-all',
                i === 0 ? 'bg-emerald-500' : 'bg-rose-500',
                q.correctIndex === i
                  ? 'ring-4 ring-offset-2 ring-offset-background'
                  : 'opacity-60 hover:opacity-100',
                q.correctIndex === i && (i === 0 ? 'ring-emerald-300' : 'ring-rose-300'),
              )}
            >
              {i === 0 ? <Check className="size-6" /> : <X className="size-6" />} {label}
            </button>
          ))}
        </div>
      )}

      {type === 'open_text' && (
        <Input
          label="Correct Answer *"
          value={q.correctAnswer ?? ''}
          onChange={(e) => onChange('correctAnswer', e.target.value)}
          placeholder="e.g. Paris (case-insensitive)"
        />
      )}

      {type === 'closest_to' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              noMargin
              label="Range Min *"
              type="number"
              value={q.rangeMin ?? 1}
              onChange={(e) => onChange('rangeMin', Number(e.target.value))}
            />
            <Input
              noMargin
              label="Range Max *"
              type="number"
              value={q.rangeMax ?? 100}
              onChange={(e) => onChange('rangeMax', Number(e.target.value))}
            />
          </div>
          <Input
            noMargin
            label="Correct Answer (integer) *"
            type="number"
            value={q.correctAnswer ?? ''}
            onChange={(e) => onChange('correctAnswer', e.target.value)}
            placeholder="Must be within the range"
          />
          <p className="text-sm text-muted-foreground">
            Players type a whole number within the range. Closest guesses score the most points.
          </p>
        </div>
      )}

      {type === 'fill_blank' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Write <code className="rounded bg-border px-1">___</code> (3+ underscores) in the
            question text for each blank — {blankCount} detected. Partial credit is awarded per
            blank.
          </p>
          {blankCount === 0 && (
            <p className="text-sm text-destructive">
              Add ___ to the question text above to create a blank.
            </p>
          )}
          {Array.from({ length: blankCount }, (_, bi) => (
            <Input
              // biome-ignore lint/suspicious/noArrayIndexKey: blanks are positional by design
              key={`blank-${bi}`}
              noMargin
              label={`Blank ${bi + 1} — accepted answers (comma-separated)`}
              value={(q.blanks?.[bi] ?? []).join(', ')}
              onChange={(e) => ops.setBlankAccepted(bi, e.target.value)}
              placeholder="Paris, City of Light"
            />
          ))}
        </div>
      )}

      {type === 'ordering' && <OrderingItems q={q} ops={ops} />}

      {type === 'geo' && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Click the map to set the correct location. Players drop a pin on a live map and score by
            real-world distance.
          </p>
          <MapPicker value={q.geo ?? null} onChange={(p) => onChange('geo', p)} height={340} />
          {q.geo && (
            <p className="text-xs text-muted-foreground">
              Correct location: {q.geo.lat.toFixed(4)}, {q.geo.lng.toFixed(4)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Kahoot-style answer tiles (single + multi select) ───────────────────────────
function ChoiceTiles({
  q,
  ops,
  onChange,
  multi,
}: {
  q: ImportQuestion;
  ops: ReturnType<typeof questionOps>;
  onChange: (field: keyof ImportQuestion, value: unknown) => void;
  multi: boolean;
}) {
  const opts = q.options ?? [];
  // Which answer index the media picker is open for (null = closed).
  const [pickFor, setPickFor] = useState<number | null>(null);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {opts.map((opt, oi) => {
          const correct = multi ? (q.correctIndices ?? []).includes(oi) : q.correctIndex === oi;
          const Glyph = quadIcon(oi);
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: option rows are positional
              key={`opt-${oi}`}
              className={cn(
                'flex items-center overflow-hidden rounded-2xl text-white shadow-sm transition-all',
                correct ? 'ring-4 ring-white/85' : 'ring-1 ring-black/10',
              )}
              style={{ background: quadColor(oi) }}
            >
              <span className="flex h-16 w-14 shrink-0 items-center justify-center bg-black/15">
                <Glyph className="size-5 fill-current" />
              </span>
              <div className="min-w-0 flex-1 px-3">
                <input
                  value={opt}
                  onChange={(e) => ops.updateOption(oi, e.target.value)}
                  placeholder={`Add answer ${oi + 1}${oi >= 2 ? ' (optional)' : ''}`}
                  className="w-full bg-transparent py-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/70"
                />
                {isImageUrl(opt) && (
                  <img
                    src={opt}
                    alt={`Option ${optionLetter(oi)} preview`}
                    className="mb-2 max-h-[80px] max-w-full rounded-md object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => setPickFor(oi)}
                title="Pick an image or GIF for this answer"
                className="flex h-16 w-11 shrink-0 items-center justify-center text-white/75 hover:text-white"
              >
                <ImageIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => (multi ? ops.toggleCorrectIndex(oi) : onChange('correctIndex', oi))}
                title={correct ? 'Correct answer' : 'Mark correct'}
                className={cn(
                  'flex h-16 w-12 shrink-0 items-center justify-center transition-colors',
                  correct
                    ? 'bg-white/25 text-white'
                    : 'text-white/60 hover:bg-black/10 hover:text-white',
                )}
              >
                <Check className="size-5" />
              </button>
              {opts.length > 2 && (
                <button
                  type="button"
                  onClick={() => ops.removeOption(oi)}
                  title="Remove option"
                  className="flex h-16 w-10 shrink-0 items-center justify-center text-white/60 hover:bg-black/10 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={() => ops.addOption()}>
          <Plus className="size-3.5" /> Add answer
        </Button>
        <p className="text-xs text-muted-foreground">
          {multi ? 'Mark every correct answer.' : 'Mark the correct answer.'} Use the image button
          to set a picture or GIF answer.
        </p>
      </div>
      <MediaPicker
        open={pickFor !== null}
        allow={['image', 'gif']}
        onClose={() => setPickFor(null)}
        onPick={(m) => {
          if (pickFor !== null) ops.updateOption(pickFor, m.url);
        }}
      />
    </div>
  );
}

function OrderingItems({ q, ops }: { q: ImportQuestion; ops: ReturnType<typeof questionOps> }) {
  const opts = q.options ?? [];
  const reorder = usePointerReorder((from, to) => ops.reorderOptions(from, to));
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        Items in correct order{' '}
        <span className="font-normal text-muted-foreground/70">
          — drag to reorder; players see them shuffled and drag into order
        </span>
      </p>
      <div
        className={cn(reorder.dragPos !== null && 'touch-none select-none')}
        {...reorder.listProps}
      >
        {opts.map((opt, oi) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: item rows are positional
            key={`order-${oi}`}
            style={reorder.dragStyle(oi)}
            className={cn(
              'mb-2 flex items-center gap-2 rounded-lg p-1',
              reorder.dragPos === oi
                ? 'cursor-grabbing bg-muted shadow-2xl ring-2 ring-primary'
                : reorder.dragPos !== null
                  ? 'opacity-60 transition-transform'
                  : '',
            )}
          >
            <button
              type="button"
              aria-label="Drag to reorder"
              {...reorder.handleProps(oi)}
              className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </button>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-border text-[0.8rem] font-extrabold text-muted-foreground">
              {oi + 1}
            </span>
            <Input
              className="mb-0 flex-1"
              noMargin
              value={opt}
              onChange={(e) => ops.updateOption(oi, e.target.value)}
              placeholder={`Item ${oi + 1}`}
            />
            {opts.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => ops.removeOption(oi)}
                title="Remove item"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-1"
        onClick={() => ops.addOption()}
      >
        <Plus className="size-3.5" /> Add Item
      </Button>
    </div>
  );
}
