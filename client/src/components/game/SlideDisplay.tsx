import { LeaderboardList } from '@/components/game/LeaderboardList';
import { QuestionImage } from '@/components/QuestionImage';
import { QuestionText } from '@/components/QuestionText';
import { hasQuestionImage } from '@/helpers';
import type { SlidePayload } from '@/types';

const STANDINGS_LIMIT = 10;

interface Props {
  slide: SlidePayload;
  /** Big-screen sizing for the room display. */
  stage?: boolean;
  /** Player view: highlight this player, and show their rank if outside the top rows. */
  playerId?: number;
}

/** A non-question slide: a section title with optional body and image, or live standings. */
export function SlideDisplay({ slide, stage, playerId }: Props) {
  const standings = slide.slideType === 'standings_slide';
  const entries = slide.leaderboard ?? [];
  const me = entries.find((e) => e.playerId === playerId);

  return (
    <div
      className={`mx-auto flex w-full flex-col items-center gap-6 text-center ${
        stage ? 'max-w-[1200px]' : 'max-w-[700px]'
      }`}
    >
      <div
        className="w-full font-extrabold"
        style={{
          fontSize: stage ? 'clamp(2.2rem, 5vw, 5rem)' : 'clamp(1.6rem, 5vw, 2.5rem)',
          lineHeight: 1.15,
        }}
      >
        <QuestionText text={slide.title} />
      </div>

      {hasQuestionImage(slide.imageUrl) && (
        <QuestionImage src={slide.imageUrl} className="question-image" />
      )}

      {slide.body && (
        <p
          className="w-full whitespace-pre-line text-muted-foreground"
          style={{ fontSize: stage ? 'clamp(1.3rem, 2.4vw, 2.4rem)' : '1.1rem' }}
        >
          {slide.body}
        </p>
      )}

      {standings &&
        (entries.length > 0 ? (
          <div className="w-full text-left">
            <LeaderboardList
              entries={entries}
              limit={STANDINGS_LIMIT}
              highlightPlayerId={playerId}
              animate
            />
            {me && me.rank > STANDINGS_LIMIT && (
              <p className="mt-3 text-center font-semibold">
                You're #{me.rank} with {me.totalScore.toLocaleString()} points
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">The live standings appear here during the game.</p>
        ))}
    </div>
  );
}
