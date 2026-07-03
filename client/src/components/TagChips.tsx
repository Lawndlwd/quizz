import { tagChipStyle } from '@/helpers';
import { cn } from '@/lib/utils';

type TagList = Array<[string, number]> | string[];

/** Colored quiz tag pills (same tag → same color), with an optional ×count. */
export function TagChips({ tags, className }: { tags?: TagList | null; className?: string }) {
  if (!tags || tags.length === 0) return null;
  const entries: Array<[string, number]> = tags.map((t) =>
    Array.isArray(t) ? [t[0], t[1]] : [t, 1],
  );
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {entries.map(([tag, count]) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          style={tagChipStyle(tag)}
        >
          {tag}
          {count > 1 && <b>×{count}</b>}
        </span>
      ))}
    </div>
  );
}
