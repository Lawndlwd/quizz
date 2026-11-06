import { Lightbulb } from 'lucide-react';
import { hasText } from '@/helpers';

interface Props {
  explanation?: string;
  className?: string;
}

export function QuestionExplanation({ explanation, className }: Props) {
  if (!hasText(explanation)) return null;

  return (
    <div className={className ?? 'mt-6 rounded-2xl border zync-gs px-6 py-5'}>
      <p className="mb-2 flex items-center gap-2 text-[0.85rem] font-bold uppercase tracking-[0.1em] text-brand">
        <Lightbulb aria-hidden className="size-4" />
        Explanation
      </p>
      <p className="text-[1.2rem] font-medium leading-relaxed text-foreground">{explanation}</p>
    </div>
  );
}
