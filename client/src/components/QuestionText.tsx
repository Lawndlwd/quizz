import { Fragment, type ReactNode } from 'react';
import { splitFenced } from '@/helpers';

// Inline code: `code` (single line, no backticks inside)
const INLINE = /`([^`\n]+)`/g;

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  INLINE.lastIndex = 0;
  let m: RegExpExecArray | null = INLINE.exec(text);
  while (m !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <code key={`${keyBase}-c${i}`} className="q-code-inline">
        {m[1]}
      </code>,
    );
    last = m.index + m[0].length;
    i++;
    m = INLINE.exec(text);
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Renders question text with markdown-style code support:
 *   - fenced ```blocks``` become <pre> code blocks (whitespace preserved)
 *   - `inline` spans become <code>
 * Everything else renders as plain text. No wrapper element — drops straight
 * into whatever container already styles the question.
 */
export function QuestionText({ text }: { text: string }) {
  const parts: ReactNode[] = splitFenced(text).map((seg, i) =>
    seg.type === 'code' ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: static per render
      <pre key={`p${i}`} className="q-code-block">
        <code>{seg.content}</code>
      </pre>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: static per render
      <Fragment key={`t${i}`}>{renderInline(seg.content, `t${i}`)}</Fragment>
    ),
  );
  return <>{parts.length ? parts : text}</>;
}
