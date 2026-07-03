import type { CSSProperties, ReactNode } from 'react';
import { QuadGlyph } from '@/components/game/QuadGlyph';
import { OptionText } from '@/components/OptionText';
import { quadColor } from '@/helpers';
import { cn } from '@/lib/utils';

interface Props {
  options: string[];
  /** `false` renders static (non-clickable) divs for the host view. */
  interactive?: boolean;
  /** Single-choice selection. Once set (non-null), every option is disabled. */
  selectedIndex?: number | null;
  /** Multi-select selection: these options get the `selected` class. */
  selectedIndices?: number[];
  /** 50/50-joker eliminations: dimmed, disabled, badge/label become an em-dash. */
  eliminatedIndices?: number[];
  /** Disables every option (e.g. after a multi-select submit). */
  disabled?: boolean;
  /** Per-option accent color; defaults to `quadColor`. */
  colorFor?: (index: number) => string;
  /** Full badge override (e.g. ✓/✗ for true/false). */
  badgeFor?: (index: number) => ReactNode;
  /** Badge shown instead of the glyph while an option is selected (multi-select ✓). */
  selectedBadge?: ReactNode;
  /** Size of the default QuadGlyph badge. */
  glyphSize?: number;
  /** Entrance-animation stagger per option, in seconds. */
  staggerSec?: number;
  onSelect?: (index: number) => void;
  className?: string;
  optionClassName?: string;
  labelClassName?: string;
}

/**
 * The colored 2×2 answer grid (`quad-grid` / `option-quad`) shared by the host
 * question view and the player multiple-choice / multi-select / true-false
 * screens. Each option gets its `--quad-color` CSS variable and a staggered
 * entrance-animation delay.
 */
export function QuadOptionGrid({
  options,
  interactive = true,
  selectedIndex = null,
  selectedIndices = [],
  eliminatedIndices = [],
  disabled = false,
  colorFor = quadColor,
  badgeFor,
  selectedBadge,
  glyphSize = 22,
  staggerSec = 0.08,
  onSelect,
  className,
  optionClassName,
  labelClassName,
}: Props) {
  return (
    <div className={cn('quad-grid', className)}>
      {options.map((opt, i) => {
        const eliminated = eliminatedIndices.includes(i);
        const selected = selectedIndex === i || selectedIndices.includes(i);
        const key = String.fromCharCode(65 + i);
        const style = {
          '--quad-color': colorFor(i),
          ...(interactive ? {} : { cursor: 'default' }),
          animationDelay: `${i * staggerSec}s`,
        } as CSSProperties;
        const badge = badgeFor ? (
          badgeFor(i)
        ) : eliminated ? (
          '—'
        ) : selected && selectedBadge !== undefined ? (
          selectedBadge
        ) : (
          <QuadGlyph index={i} size={glyphSize} />
        );
        const body = (
          <>
            <span className="quad-badge">{badge}</span>
            <span className={cn('quad-label', labelClassName)}>
              {eliminated ? '—' : <OptionText value={opt} />}
            </span>
          </>
        );
        const optionClass = cn(
          'option-quad',
          optionClassName,
          selected && 'selected',
          eliminated && 'dim',
        );

        if (!interactive) {
          return (
            <div key={key} className={optionClass} style={style}>
              {body}
            </div>
          );
        }
        return (
          <button
            type="button"
            key={key}
            disabled={disabled || eliminated || selectedIndex !== null}
            onClick={() => onSelect?.(i)}
            className={optionClass}
            style={style}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
