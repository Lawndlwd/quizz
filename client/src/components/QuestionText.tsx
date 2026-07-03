import { Fragment, type ReactNode } from 'react';

// Fenced code block: ```lang\n…code…\n```  (lang optional)
const FENCE = /```[a-zA-Z0-9+#.-]*\n?([\s\S]*?)```/g;
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
  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  FENCE.lastIndex = 0;
  let m: RegExpExecArray | null = FENCE.exec(text);
  while (m !== null) {
    if (m.index > last) {
      parts.push(<Fragment key={`t${i}`}>{renderInline(text.slice(last, m.index), `t${i}`)}</Fragment>);
    }
    parts.push(
      <pre key={`p${i}`} className="q-code-block">
        <code>{m[1].replace(/\n$/, '')}</code>
      </pre>,
    );
    last = m.index + m[0].length;
    i++;
    m = FENCE.exec(text);
  }
  if (last < text.length) {
    parts.push(<Fragment key="tail">{renderInline(text.slice(last), 'tail')}</Fragment>);
  }
  return <>{parts.length ? parts : text}</>;
}
