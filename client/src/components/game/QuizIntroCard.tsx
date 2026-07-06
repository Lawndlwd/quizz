import { CircleHelp, Timer, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { TagChips } from '@/components/TagChips';
import { formatTime, QUESTION_TYPE_META } from '@/helpers';
import { cn } from '@/lib/utils';
import type { QuizIntro } from '@/types';

interface Props {
  intro?: QuizIntro | null;
  /** Heading overlaid on the cover; defaults to the intro title. */
  title?: string;
  typesHeading?: string;
  /** `row`: cover on the left (host lobby); `grid`: two equal halves (player waiting screen). */
  layout?: 'row' | 'grid';
  /** Extra content appended to the details column (e.g. player status). */
  footer?: ReactNode;
  className?: string;
}

export function QuizIntroCard({
  intro,
  title,
  typesHeading = 'Question types',
  layout = 'row',
  footer,
  className,
}: Props) {
  const isRow = layout === 'row';
  const heading = title ?? intro?.title;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border sm:items-stretch',
        isRow ? 'flex flex-col sm:flex-row' : 'grid sm:grid-cols-2',
        className,
      )}
    >
      {/* Cover image (or a themed placeholder) with the title overlaid */}
      <div
        className={cn(
          'relative',
          isRow ? 'min-h-[180px] sm:w-[320px] sm:shrink-0' : 'min-h-[200px] sm:min-h-[440px]',
        )}
      >
        {intro?.coverImage ? (
          <img
            src={intro.coverImage}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-white/90"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--surface2))' }}
          >
            <Zap className="size-16" aria-hidden />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <h1
          className={cn(
            'absolute inset-x-0 bottom-0 text-2xl font-extrabold leading-tight text-white drop-shadow-lg',
            isRow ? 'p-4' : 'p-5 sm:text-3xl',
          )}
        >
          {heading}
        </h1>
      </div>

      {/* Quiz details */}
      <div className={cn('flex flex-col p-5', isRow && 'flex-1 justify-center')}>
        {intro?.subtitle && (
          <p
            className={cn(
              'leading-relaxed text-muted-foreground',
              isRow ? 'text-[0.98rem]' : 'mt-2 text-[0.95rem]',
            )}
          >
            {intro.subtitle}
          </p>
        )}

        {intro && (
          <div className={cn('flex flex-wrap gap-2', isRow ? 'mt-3' : 'mt-4')}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium">
              <CircleHelp className="size-4" /> {intro.questionCount} question
              {intro.questionCount === 1 ? '' : 's'}
            </span>
            {intro.totalTimeSec > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium">
                <Timer className="size-4" /> ~{formatTime(intro.totalTimeSec)}
              </span>
            )}
          </div>
        )}

        {intro && intro.typeCounts.length > 0 && (
          <div className={isRow ? 'mt-4' : 'mt-5'}>
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {typesHeading}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {intro.typeCounts.map(([type, count]) => {
                const meta = QUESTION_TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium"
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {meta.label}
                    {count > 1 && <b className="text-foreground">×{count}</b>}
                  </span>
                );
              })}
            </div>
            {intro.tags.length > 0 && (
              <>
                <div className="my-3 h-px bg-border" />
                <TagChips tags={intro.tags} />
              </>
            )}
          </div>
        )}

        {footer}
      </div>
    </div>
  );
}
