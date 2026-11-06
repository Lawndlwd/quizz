import { ArrowRight, Flag } from 'lucide-react';
import { SlideDisplay } from '@/components/game/SlideDisplay';
import { MainContent } from '@/components/layout';
import { Button } from '@/components/ui/button';
import type { NextPreview, SlidePayload } from '../../../types';
import { UpNextCard } from './UpNextCard';

interface Props {
  slide: SlidePayload;
  nextPreview: NextPreview | null;
  onNext: () => void;
  onEndGame: () => void;
}

/** Host view of a slide. Slides never advance on their own: this Next button is the only way on. */
export function GameSlide({ slide, nextPreview, onNext, onEndGame }: Props) {
  return (
    <MainContent>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onEndGame}>
          End Game
        </Button>
        <Button type="button" size="lg" onClick={onNext} className="min-w-0 sm:min-w-[180px]">
          {slide.isLast ? (
            <span className="flex items-center gap-1.5">
              <Flag className="size-4" /> Final Scores
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              Next <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </div>
      {nextPreview && <UpNextCard preview={nextPreview} />}
      <div className="mt-6">
        <SlideDisplay slide={slide} />
      </div>
    </MainContent>
  );
}
