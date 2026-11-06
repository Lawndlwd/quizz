import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { QuestionReveal } from '@/components/game/QuestionReveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AnswerKey } from '@/types';

/** Host-only answer. Starts hidden: the host's laptop may be mirrored to the room. */
export function AnswerKeyPanel({ answerKey }: { answerKey: AnswerKey }) {
  const [visible, setVisible] = useState(false);
  const results =
    answerKey.questionType === 'true_false' && answerKey.options.length === 0
      ? { ...answerKey, options: ['True', 'False'] }
      : answerKey;

  return (
    <Card className="mb-4 w-full max-w-5xl">
      <CardContent className="p-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {visible ? 'Hide answer' : 'Show answer'}
        </Button>
        {visible && (
          <div className="mt-3">
            <QuestionReveal results={results} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
