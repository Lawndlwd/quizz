import { Plus, X } from 'lucide-react';
import type { QuestionWithKey } from '@/helpers';
import { quadColor } from '@/helpers';
import { cn } from '@/lib/utils';
import { TYPE_SHORT } from './types';

interface Props {
  questions: QuestionWithKey[];
  active: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  /** Vertical sidebar (desktop) or horizontal strip (mobile). */
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

export function SlideRail({
  questions,
  active,
  onSelect,
  onAdd,
  onRemove,
  layout = 'vertical',
  className,
}: Props) {
  const horizontal = layout === 'horizontal';

  return (
    <aside
      className={cn(
        'studio-scroll shrink-0 border-border bg-muted/20',
        horizontal
          ? 'flex w-full gap-2 overflow-x-auto border-b p-2'
          : 'flex w-[210px] flex-col overflow-y-auto border-r p-3',
        className,
      )}
    >
      {!horizontal && (
        <div className="mb-3 px-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Slides · {questions.length}
        </div>
      )}

      {questions.map((q, i) => {
        const type = q.questionType ?? 'multiple_choice';
        const optCount = Math.max((q.options ?? []).length, type === 'true_false' ? 2 : 1);
        return (
          <div
            key={q._key}
            className={cn('group relative', horizontal ? 'w-[140px] shrink-0' : 'mb-2')}
          >
            <button
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                'w-full cursor-pointer rounded-xl border p-2.5 text-left transition-colors',
                i === active
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40',
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-extrabold',
                    i === active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
                <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {TYPE_SHORT[type]}
                </span>
              </div>
              <div
                className={cn(
                  'line-clamp-2 font-medium text-foreground/80',
                  horizontal ? 'mb-1.5 min-h-[2em] text-[0.65rem]' : 'mb-2 min-h-[2.2em] text-[0.7rem]',
                )}
              >
                {q.text || 'Untitled question'}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {Array.from({ length: Math.min(optCount, 4) }, (_, oi) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: decorative color bars
                    key={oi}
                    className="h-2.5 rounded-sm"
                    style={{ background: quadColor(oi) }}
                  />
                ))}
              </div>
            </button>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                title="Delete slide"
                className={cn(
                  'absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white',
                  horizontal ? 'opacity-100' : 'hidden group-hover:flex',
                )}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        className={cn(
          'flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-border py-2.5 text-xs font-bold text-primary transition-colors hover:border-primary hover:bg-primary/5',
          horizontal ? 'w-[100px] shrink-0 px-2' : 'mt-1 w-full',
        )}
      >
        <Plus className="size-3.5" /> Add
      </button>
    </aside>
  );
}
