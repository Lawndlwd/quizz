import { Code2, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { splitFenced } from '@/helpers';
import { cn } from '@/lib/utils';

interface Block {
  id: string;
  type: 'text' | 'code';
  lang: string;
  content: string;
}

/** Split a markdown string into text / code blocks (shared game parser). */
function parse(md: string): Block[] {
  const blocks: Omit<Block, 'id'>[] = splitFenced(md);
  if (blocks.length === 0) blocks.push({ type: 'text', lang: '', content: '' });
  return blocks.map((b) => ({ ...b, id: crypto.randomUUID() }));
}

/** Reassemble blocks back into the markdown string stored on the question. */
function serialize(blocks: Block[]): string {
  let out = '';
  blocks.forEach((b, i) => {
    // Blocks need a separator or adjacent text blocks merge into one word
    // ("Hello" + "World" → "HelloWorld") and fences butt against text.
    if (i > 0) out += blocks[i - 1].type === 'text' && b.type === 'text' ? '\n\n' : '\n';
    out += b.type === 'code' ? `\`\`\`${b.lang}\n${b.content}\n\`\`\`` : b.content;
  });
  return out;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Block-based question editor: normal text lines plus real code boxes you type
 * into. Serialised to ```fenced``` markdown so the player screen renders it the
 * same way. Inline code (single backticks) is still typed inside text blocks.
 */
export function QuestionTextEditor({ value, onChange }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() => parse(value));
  // Track the last markdown we emitted so external changes (switching slides)
  // re-parse, but our own edits don't clobber the caret.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setBlocks(parse(value));
      lastEmitted.current = value;
    }
  }, [value]);

  function commit(next: Block[]) {
    const safe = next.length ? next : parse('');
    setBlocks(safe);
    const md = serialize(safe);
    lastEmitted.current = md;
    onChange(md);
  }

  const update = (id: string, patch: Partial<Block>) =>
    commit(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const remove = (id: string) => commit(blocks.filter((b) => b.id !== id));
  const add = (type: Block['type']) =>
    commit([...blocks, { id: crypto.randomUUID(), type, lang: '', content: '' }]);

  return (
    <div className="mb-5 space-y-2">
      {blocks.map((b, i) =>
        b.type === 'text' ? (
          <div key={b.id} className="group relative">
            <textarea
              rows={1}
              value={b.content}
              onChange={(e) => update(b.id, { content: e.target.value })}
              placeholder={i === 0 ? 'Start typing your question…' : 'More text…'}
              className="field-sizing-content w-full resize-none rounded-xl border border-border bg-white/[0.03] px-4 py-3 text-center text-2xl font-extrabold tracking-tight outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            {blocks.length > 1 && (
              <button
                type="button"
                onClick={() => remove(b.id)}
                title="Remove block"
                className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive group-hover:flex"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <div
            key={b.id}
            className="group relative overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117]"
          >
            <div className="flex items-center gap-2 border-b border-[#30363d] px-3 py-1.5">
              <Code2 className="size-3.5 text-slate-400" />
              <input
                value={b.lang}
                onChange={(e) => update(b.id, { lang: e.target.value.trim() })}
                placeholder="language (optional)"
                className="flex-1 bg-transparent text-xs text-slate-300 outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => remove(b.id)}
                title="Remove code block"
                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-rose-400"
              >
                <X className="size-4" />
              </button>
            </div>
            <textarea
              rows={2}
              value={b.content}
              onChange={(e) => update(b.id, { content: e.target.value })}
              placeholder="your code…"
              spellCheck={false}
              className={cn(
                'field-sizing-content w-full resize-none bg-transparent px-4 py-3',
                'font-mono text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-500',
              )}
            />
          </div>
        ),
      )}

      <div className="flex justify-center gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => add('text')}>
          <Plus className="size-3.5" /> Text
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => add('code')}>
          <Code2 className="size-3.5" /> Code block
        </Button>
      </div>
    </div>
  );
}
