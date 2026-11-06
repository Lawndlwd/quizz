import { ArrowRight, Check, Copy, Flag, Monitor, Square, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { copyText } from '@/helpers';

interface PanelProps {
  baseUrl: string;
  pin: string;
  screenCount: number;
}

function isLocalUrl(url: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Screen link and status strip at the top of the host console. */
export function PresentationPanel({ baseUrl, pin, screenCount }: PanelProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const screenUrl = `${baseUrl}/screen/${pin}`;
  const connected = screenCount > 0;

  async function copyLink() {
    if (await copyText(screenUrl)) {
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } else {
      setCopyState('failed');
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <output className="inline-flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-ok' : 'bg-warn'}`}
          />
          {connected
            ? `Screen connected${screenCount > 1 ? ` (${screenCount})` : ''}`
            : 'No screen connected'}
        </output>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Press N or → to advance
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={connected ? 'secondary' : 'default'}
            onClick={() => window.open(screenUrl, `quizz-screen-${pin}`, 'popup')}
          >
            <Monitor className="size-4" /> Open screen
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={copyLink}>
            {copyState === 'copied' ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copyState === 'copied' ? 'Copied' : 'Copy screen link'}
          </Button>
        </div>
        {copyState === 'failed' && (
          <div className="w-full">
            <p className="mb-1 text-sm text-warn">
              Your browser blocked copying. Select this link and copy it yourself:
            </p>
            <Input
              readOnly
              aria-label="Screen link"
              value={screenUrl}
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}
        {isLocalUrl(baseUrl) && (
          <p className="flex w-full items-center gap-1.5 text-sm text-warn">
            <TriangleAlert className="size-4 shrink-0" />
            Phones can't reach localhost. Set a Public URL in Settings so the QR code works.
          </p>
        )}
      </div>
    </div>
  );
}

interface BarProps {
  phase: 'question' | 'results' | 'slide';
  isLastQuestion: boolean;
  onFinishQuestion: () => void;
  onNextQuestion: () => void;
}

/** Thumb-reach primary action for hosts driving the game from a phone. */
export function PresentationActionBar({
  phase,
  isLastQuestion,
  onFinishQuestion,
  onNextQuestion,
}: BarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
      {phase === 'question' ? (
        <Button type="button" size="lg" className="w-full" onClick={onFinishQuestion}>
          <Square className="size-4" /> Finish question
        </Button>
      ) : (
        <Button type="button" size="lg" className="w-full" onClick={onNextQuestion}>
          {isLastQuestion ? (
            <>
              <Flag className="size-4" /> Final scores
            </>
          ) : (
            <>
              Next <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
