import { hasText } from '@/helpers';

interface Props {
  explanation?: string;
  className?: string;
}

export function QuestionExplanation({ explanation, className }: Props) {
  if (!hasText(explanation)) return null;

  return (
    <div
      className={
        className ??
        'mt-6 rounded-2xl border border-blue-500/35 bg-blue-500/[0.12] px-6 py-5 shadow-[0_0_30px_-12px_rgba(59,130,246,0.6)]'
      }
    >
      <p className="mb-2 flex items-center gap-2 text-[0.85rem] font-bold uppercase tracking-[0.1em] text-blue-300">
        <span aria-hidden className="text-[1.1rem]">
          💡
        </span>
        Explanation
      </p>
      <p className="text-[1.2rem] font-medium leading-relaxed text-foreground">{explanation}</p>
    </div>
  );
}
