import { ListChecks, type LucideIcon, Timer, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { Input, Textarea } from '@/components/Input';
import { TagInput } from '@/components/TagInput';
import { cn } from '@/lib/utils';
import type { ImportQuestion } from '@/types';
import type { questionOps } from './questionOps';
import { ALL_TYPES, TYPE_META } from './types';

function SectionTitle({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
      {Icon && <Icon className="size-3.5 text-muted-foreground" />}
      {children}
    </h4>
  );
}

interface Props {
  q: ImportQuestion;
  ops: ReturnType<typeof questionOps>;
  onChange: (field: keyof ImportQuestion, value: unknown) => void;
}

const TIME_PRESETS = [10, 20, 30, 60, 90];
const POINT_PRESETS: { label: string; value: number }[] = [
  { label: 'Standard', value: 500 },
  { label: 'Double', value: 1000 },
  { label: 'None', value: 0 },
];

function chip(active: boolean) {
  return cn(
    'rounded-lg border px-3 py-1.5 text-[0.8rem] font-semibold transition-colors',
    active
      ? 'border-transparent bg-primary text-primary-foreground'
      : 'border-border text-muted-foreground hover:text-foreground',
  );
}

export function PropertiesPanel({ q, ops, onChange }: Props) {
  const { type } = ops;
  const supportsMulti = type === 'multiple_choice' || type === 'multi_select';

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Question type */}
      <section>
        <SectionTitle>Question type</SectionTitle>
        <div className="flex flex-col gap-1.5">
          {ALL_TYPES.map((t) => {
            const Icon = TYPE_META[t].icon;
            return (
              <button
                key={t}
                type="button"
                onClick={() => ops.setType(t)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[0.85rem] font-semibold transition-colors',
                  type === t
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {TYPE_META[t].label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Time limit */}
      <section>
        <SectionTitle icon={Timer}>Time limit</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {TIME_PRESETS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange('timeSec', t)}
              className={chip((q.timeSec ?? 20) === t)}
            >
              {t}s
            </button>
          ))}
        </div>
        <Input
          noMargin
          className="mt-2"
          type="number"
          min={5}
          max={120}
          value={q.timeSec ?? 20}
          onChange={(e) => onChange('timeSec', Number(e.target.value))}
        />
      </section>

      {/* Points */}
      <section>
        <SectionTitle icon={Trophy}>Points</SectionTitle>
        <div className="mb-2 flex gap-1.5">
          {POINT_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange('baseScore', p.value)}
              className={cn(chip(q.baseScore === p.value), 'flex-1 text-center')}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Input
          noMargin
          label="Base score"
          type="number"
          min={0}
          step={50}
          value={q.baseScore}
          onChange={(e) => onChange('baseScore', Number(e.target.value))}
        />
      </section>

      {/* Answer options mode */}
      {supportsMulti && (
        <section>
          <SectionTitle icon={ListChecks}>Answer options</SectionTitle>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => ops.setType('multiple_choice')}
              className={cn(chip(type === 'multiple_choice'), 'flex-1 text-center')}
            >
              Single select
            </button>
            <button
              type="button"
              onClick={() => ops.setType('multi_select')}
              className={cn(chip(type === 'multi_select'), 'flex-1 text-center')}
            >
              Multi-select
            </button>
          </div>
        </section>
      )}

      {/* Tags */}
      <section>
        <TagInput
          label="Tags"
          value={q.tags ?? []}
          onChange={(tags) => onChange('tags', tags)}
          placeholder="Type a tag, press comma…"
        />
      </section>

      {/* Explanation */}
      <section>
        <Textarea
          noMargin
          label="Explanation (shown after timer)"
          rows={3}
          className="resize-y"
          value={q.explanation ?? ''}
          onChange={(e) => onChange('explanation', e.target.value || undefined)}
          placeholder="Why is this the answer?"
        />
      </section>
    </div>
  );
}
