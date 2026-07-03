import { type KeyboardEvent, useId, useState } from 'react';
import { Label } from '@/components/ui/label';
import { tagChipStyle } from '@/helpers';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
}

/**
 * Token input for tags — typing a comma or Enter commits the current text as a
 * colored chip. Duplicate tags (case-insensitive) are ignored; the color is
 * derived from the tag text, so identical tags always share a color.
 */
export function TagInput({ value, onChange, label, placeholder }: Props) {
  const id = useId();
  const [text, setText] = useState('');

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (!exists) onChange([...value, tag]);
  }

  function commitFrom(input: string) {
    // Support pasting/typing several comma-separated tags at once.
    const parts = input.split(',');
    const trailing = parts.pop() ?? '';
    for (const p of parts) addTag(p);
    setText(trailing.trimStart());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      addTag(text);
      setText('');
    } else if (e.key === 'Backspace' && text === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="mb-5 flex flex-col gap-2">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
      )}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: focuses the inner input */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by the input itself */}
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-2 focus-within:ring-1 focus-within:ring-ring"
        onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
            style={tagChipStyle(tag)}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-0.5 opacity-70 hover:opacity-100"
              aria-label={`Remove ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => commitFrom(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            addTag(text);
            setText('');
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
