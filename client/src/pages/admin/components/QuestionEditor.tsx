import { useEffect } from 'react';
import { MapPicker } from '@/components/GeoMap';
import { FormRow } from '@/components/layout';
import { QuestionImage } from '@/components/QuestionImage';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  countBlanks,
  hasQuestionImage,
  isImageUrl,
  parseYouTubeId,
  parseYouTubeStart,
} from '@/helpers';
import { TagInput } from '@/components/TagInput';
import { QuestionMedia } from '@/components/QuestionMedia';
import { cn } from '@/lib/utils';
import { Input, Textarea } from '../../../components/Input';
import type { ImportQuestion, QuestionType } from '../../../types';

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Single Choice',
  multi_select: 'Multiple Answers',
  true_false: 'True / False',
  open_text: 'Open Text',
  closest_to: 'Closest To',
  fill_blank: 'Fill Blank',
  ordering: 'Ordering',
  geo: 'Locate on Map',
};

export function blankQuestion(): ImportQuestion {
  return {
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    baseScore: 500,
    timeSec: 20,
    questionType: 'multiple_choice',
  };
}

interface Props {
  q: ImportQuestion;
  qi: number;
  onChange: (field: keyof ImportQuestion, value: unknown) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function QuestionEditor({ q, qi, onChange, onRemove, canRemove }: Props) {
  const type = q.questionType ?? 'multiple_choice';

  // A closest_to question must always carry a real range. The inputs display
  // `?? 1` / `?? 100` fallbacks, which can mask an undefined value (e.g. loaded
  // from the DB with a null range) and later fail validation — so commit the
  // defaults to the actual data.
  useEffect(() => {
    if (type !== 'closest_to') return;
    if (q.rangeMin === undefined) onChange('rangeMin', 1);
    if (q.rangeMax === undefined) onChange('rangeMax', 100);
  }, [type, q.rangeMin, q.rangeMax, onChange]);

  const media: 'none' | 'image' | 'audio' | 'video' =
    q.mediaType ?? (hasQuestionImage(q.imageUrl) ? 'image' : 'none');

  function setMedia(m: 'none' | 'image' | 'audio' | 'video') {
    if (m === 'none') {
      onChange('imageUrl', undefined);
      onChange('mediaUrl', undefined);
      onChange('mediaType', undefined);
    } else if (m === 'image') {
      onChange('mediaUrl', undefined);
      onChange('mediaType', undefined);
    } else {
      onChange('imageUrl', undefined);
      onChange('mediaType', m);
    }
  }

  function setType(t: QuestionType) {
    onChange('questionType', t);
    if (t === 'true_false') {
      onChange('options', ['True', 'False']);
      onChange('correctIndex', 0);
      onChange('correctIndices', undefined);
    } else if (t === 'open_text') {
      onChange('options', []);
      onChange('correctIndices', undefined);
    } else if (t === 'closest_to') {
      onChange('options', []);
      onChange('correctIndices', undefined);
      if (q.rangeMin === undefined) onChange('rangeMin', 1);
      if (q.rangeMax === undefined) onChange('rangeMax', 100);
    } else if (t === 'multi_select') {
      if ((q.options ?? []).length < 2) onChange('options', ['', '', '', '']);
      onChange('correctIndices', [0]);
    } else if (t === 'fill_blank') {
      onChange('options', []);
      onChange('correctIndices', undefined);
      if (!q.blanks || q.blanks.length === 0) onChange('blanks', [['']]);
    } else if (t === 'ordering') {
      if ((q.options ?? []).length < 2) onChange('options', ['', '', '']);
      onChange('correctIndices', undefined);
    } else if (t === 'geo') {
      onChange('options', []);
      onChange('correctIndices', undefined);
      onChange('mediaType', undefined);
      onChange('mediaUrl', undefined);
    } else {
      if ((q.options ?? []).length < 2) onChange('options', ['', '', '', '']);
      onChange('correctIndices', undefined);
    }
  }

  function updateOption(oi: number, value: string) {
    const opts = [...(q.options ?? [])];
    opts[oi] = value;
    onChange('options', opts);
  }

  function addOption() {
    onChange('options', [...(q.options ?? []), '']);
  }

  function removeOption(oi: number) {
    const opts = (q.options ?? []).filter((_, i) => i !== oi);
    if (type === 'multi_select') {
      const newIndices = (q.correctIndices ?? [])
        .filter((i) => i !== oi)
        .map((i) => (i > oi ? i - 1 : i));
      onChange('correctIndices', newIndices);
    } else {
      const newCorrect =
        q.correctIndex >= oi && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex;
      onChange('correctIndex', Math.min(newCorrect, opts.length - 1));
    }
    onChange('options', opts);
  }

  function toggleCorrectIndex(oi: number) {
    const current = q.correctIndices ?? [];
    if (current.includes(oi)) {
      onChange(
        'correctIndices',
        current.filter((i) => i !== oi),
      );
    } else {
      onChange('correctIndices', [...current, oi]);
    }
  }

  function moveItem(from: number, dir: -1 | 1) {
    const opts = [...(q.options ?? [])];
    const to = from + dir;
    if (to < 0 || to >= opts.length) return;
    [opts[from], opts[to]] = [opts[to], opts[from]];
    onChange('options', opts);
  }

  function setBlankAccepted(bi: number, csv: string) {
    const count = countBlanks(q.text);
    const next: string[][] = Array.from({ length: count }, (_, i) =>
      i === bi ? csv.split(',').map((s) => s.trim()) : (q.blanks?.[i] ?? []),
    );
    onChange('blanks', next);
  }

  // Keep the fill_blank answer rows in sync with the number of `___` markers.
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

  return (
    <div className="mb-4 rounded-xl border border-border bg-muted/30 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-400 text-[0.72rem] font-extrabold text-white">
            {qi + 1}
          </span>
          <h3 className="text-[0.82rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Question {qi + 1}
          </h3>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            title="Remove question"
          >
            🗑
          </Button>
        )}
      </div>

      <div className="mb-5 space-y-2">
        <Label className="text-sm font-medium">Question Type</Label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              'multiple_choice',
              'multi_select',
              'true_false',
              'open_text',
              'closest_to',
              'fill_blank',
              'ordering',
              'geo',
            ] as QuestionType[]
          ).map((t) => (
            <Button
              type="button"
              key={t}
              size="sm"
              variant={type === t ? 'default' : 'ghost'}
              onClick={() => setType(t)}
            >
              {TYPE_LABELS[t]}
            </Button>
          ))}
        </div>
      </div>

      <Textarea
        label="Question Text *"
        rows={2}
        className="resize-y w-full"
        value={q.text}
        onChange={(e) => onChange('text', e.target.value)}
        placeholder="What is…?"
      />

      <div className="mb-4 space-y-2">
        <Label className="text-sm font-medium">Media (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['none', 'None'],
              ['image', '🖼 Image'],
              ['audio', '🎵 Audio'],
              ['video', '🎬 Video'],
            ] as const
          ).map(([m, label]) => (
            <Button
              type="button"
              key={m}
              size="sm"
              variant={media === m ? 'default' : 'ghost'}
              onClick={() => setMedia(m)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {media === 'image' && (
        <>
          <Input
            label="Image URL"
            type="url"
            value={q.imageUrl ?? ''}
            onChange={(e) => onChange('imageUrl', e.target.value || undefined)}
            placeholder="https://example.com/image.jpg"
          />
          {hasQuestionImage(q.imageUrl) && (
            <QuestionImage
              src={q.imageUrl}
              alt="Preview"
              className="mb-3 max-h-[200px] max-w-full rounded-lg object-contain"
            />
          )}
        </>
      )}

      {(media === 'audio' || media === 'video') && (
        <>
          <Input
            label={`YouTube link (${media === 'audio' ? 'plays sound only, video hidden' : 'embedded video'})`}
            type="url"
            value={q.mediaUrl ?? ''}
            onChange={(e) => onChange('mediaUrl', e.target.value || undefined)}
            placeholder="https://www.youtube.com/watch?v=…  or  https://youtu.be/…"
          />
          {q.mediaUrl && !parseYouTubeId(q.mediaUrl) ? (
            <p className="mb-3 text-sm text-destructive">
              That doesn't look like a YouTube link — paste a youtube.com or youtu.be URL.
            </p>
          ) : q.mediaUrl ? (
            <div className="mb-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Tip: add <code className="rounded bg-border px-1">?t=90</code> (or{' '}
                <code className="rounded bg-border px-1">&t=1m30s</code>) to the link to start
                partway in.
                {parseYouTubeStart(q.mediaUrl) > 0 && (
                  <> Starts at {parseYouTubeStart(q.mediaUrl)}s.</>
                )}
              </p>
              <QuestionMedia url={q.mediaUrl} kind={media} autoPlay={false} />
            </div>
          ) : null}
        </>
      )}

      <Textarea
        label="Explanation (optional, any question type — shown after timer ends)"
        rows={3}
        className="resize-y w-full"
        value={q.explanation ?? ''}
        onChange={(e) => onChange('explanation', e.target.value || undefined)}
        placeholder="Why is this the answer? Add context or extra detail…"
      />

      <TagInput
        label="Tags (optional)"
        value={q.tags ?? []}
        onChange={(tags) => onChange('tags', tags)}
        placeholder="Type a tag, press comma… e.g. easy, geography, fun"
      />

      {type === 'multiple_choice' && (
        <div className="mb-3">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Answer Options</p>
          {(q.options ?? []).map((opt, oi) => (
            <div key={String.fromCharCode(65 + oi)} className="mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-extrabold',
                    q.correctIndex === oi
                      ? 'bg-emerald-500 text-white'
                      : 'bg-border text-muted-foreground',
                  )}
                >
                  {String.fromCharCode(65 + oi)}
                </span>
                <Input
                  className="mb-0 flex-1"
                  noMargin
                  value={opt}
                  onChange={(e) => updateOption(oi, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + oi)} — text or image URL`}
                />
                {(q.options ?? []).length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={() => removeOption(oi)}
                    title="Remove option"
                  >
                    ✕
                  </Button>
                )}
              </div>
              {isImageUrl(opt) && (
                <img
                  src={opt}
                  alt={`Option ${String.fromCharCode(65 + oi)} preview`}
                  className="ml-9 mt-1 max-h-[90px] max-w-full rounded-md object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.display = '';
                  }}
                />
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 text-[0.8rem]"
            onClick={addOption}
          >
            + Add Option
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste an image URL (.png, .jpg, .gif, .webp…) as an option to show a picture instead of
            text.
          </p>
        </div>
      )}

      {type === 'multi_select' && (
        <div className="mb-3">
          <p className="mb-1 text-sm font-medium text-muted-foreground">
            Answer Options{' '}
            <span className="font-normal text-muted-foreground/70">
              — check all correct answers
            </span>
          </p>
          {(q.options ?? []).map((opt, oi) => {
            const isChecked = (q.correctIndices ?? []).includes(oi);
            return (
              <div key={String.fromCharCode(65 + oi)} className="mb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrectIndex(oi)}
                    title={isChecked ? 'Mark as incorrect' : 'Mark as correct'}
                    className={cn(
                      'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 text-[0.75rem] font-extrabold',
                      isChecked ? 'bg-emerald-500 text-white' : 'bg-border text-muted-foreground',
                    )}
                  >
                    {isChecked ? '✓' : String.fromCharCode(65 + oi)}
                  </button>
                  <Input
                    className="mb-0 flex-1"
                    noMargin
                    value={opt}
                    onChange={(e) => updateOption(oi, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oi)} — text or image URL`}
                  />
                  {(q.options ?? []).length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => removeOption(oi)}
                      title="Remove option"
                    >
                      ✕
                    </Button>
                  )}
                </div>
                {isImageUrl(opt) && (
                  <img
                    src={opt}
                    alt={`Option ${String.fromCharCode(65 + oi)} preview`}
                    className="ml-9 mt-1 max-h-[90px] max-w-full rounded-md object-contain"
                  />
                )}
              </div>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 text-[0.8rem]"
            onClick={addOption}
          >
            + Add Option
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste an image URL as an option to show a picture instead of text.
          </p>
        </div>
      )}

      {type === 'true_false' && (
        <div className="mb-3">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Correct Answer</p>
          <div className="flex gap-3">
            {['True', 'False'].map((label, i) => (
              <Button
                type="button"
                key={label}
                size="lg"
                variant={q.correctIndex === i ? (i === 0 ? 'success' : 'destructive') : 'ghost'}
                className="flex-1"
                onClick={() => onChange('correctIndex', i)}
              >
                {i === 0 ? '✓' : '✗'} {label}
              </Button>
            ))}
          </div>
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
        <>
          <FormRow>
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
          </FormRow>
          <Input
            label="Correct Answer (integer) *"
            type="number"
            value={q.correctAnswer ?? ''}
            onChange={(e) => onChange('correctAnswer', e.target.value)}
            placeholder="Must be within the range"
          />
          <p className="mb-3 text-sm text-muted-foreground">
            Players type a whole number within the range. Closest guesses score the most points.
          </p>
        </>
      )}

      {type === 'fill_blank' && (
        <div className="mb-3 space-y-3">
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
              label={`Blank ${bi + 1} — accepted answers (comma-separated)`}
              value={(q.blanks?.[bi] ?? []).join(', ')}
              onChange={(e) => setBlankAccepted(bi, e.target.value)}
              placeholder="Paris, City of Light"
            />
          ))}
        </div>
      )}

      {type === 'ordering' && (
        <div className="mb-3">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Items in correct order{' '}
            <span className="font-normal text-muted-foreground/70">
              — players see them shuffled and drag into order
            </span>
          </p>
          {(q.options ?? []).map((opt, oi) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: item rows are edited in place by position
            <div key={`order-${oi}`} className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-border text-[0.75rem] font-extrabold text-muted-foreground">
                {oi + 1}
              </span>
              <Input
                className="mb-0 flex-1"
                noMargin
                value={opt}
                onChange={(e) => updateOption(oi, e.target.value)}
                placeholder={`Item ${oi + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                disabled={oi === 0}
                onClick={() => moveItem(oi, -1)}
                title="Move up"
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                disabled={oi === (q.options ?? []).length - 1}
                onClick={() => moveItem(oi, 1)}
                title="Move down"
              >
                ↓
              </Button>
              {(q.options ?? []).length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={() => removeOption(oi)}
                  title="Remove item"
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 text-[0.8rem]"
            onClick={addOption}
          >
            + Add Item
          </Button>
        </div>
      )}

      {type === 'geo' && (
        <div className="mb-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            Search a place or click the map to set the correct location. Players drop a pin on a
            live map and score by real-world distance.
          </p>
          <MapPicker
            value={q.geo ?? null}
            onChange={(p) => onChange('geo', p)}
            height={340}
            searchable
          />
          {q.geo && (
            <p className="text-xs text-muted-foreground">
              Correct location: {q.geo.lat.toFixed(4)}, {q.geo.lng.toFixed(4)}
            </p>
          )}
        </div>
      )}

      <FormRow>
        {type === 'multiple_choice' && (
          <div className="space-y-2">
            <Label htmlFor={`correct-answer-${qi}`}>Correct Answer</Label>
            <Select
              value={String(q.correctIndex)}
              onValueChange={(v) => onChange('correctIndex', Number(v))}
            >
              <SelectTrigger id={`correct-answer-${qi}`} className="w-full">
                <SelectValue placeholder="Select correct answer" />
              </SelectTrigger>
              <SelectContent>
                {(q.options ?? []).map((opt, oi) => (
                  <SelectItem key={String.fromCharCode(65 + oi)} value={String(oi)}>
                    {String.fromCharCode(65 + oi)}
                    {opt ? ` — ${opt}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Input
          noMargin
          label="Base Score"
          type="number"
          min={0}
          step={50}
          value={q.baseScore}
          onChange={(e) => onChange('baseScore', Number(e.target.value))}
        />
        <Input
          noMargin
          label="Time (seconds)"
          type="number"
          min={5}
          max={120}
          value={q.timeSec ?? 20}
          onChange={(e) => onChange('timeSec', Number(e.target.value))}
        />
      </FormRow>
    </div>
  );
}
